import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios'; // Import axios
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const ReportsView = ({ currentUser, spouseUser, expenses }) => {
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [userSpouseComparison, setUserSpouseComparison] = useState({ user: 0, spouse: 0 });
  const [allExpenses, setAllExpenses] = useState([]); // State for historical data

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch all historical expenses for the trend chart
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setAllExpenses(res.data);
      })
      .catch(err => {
        console.error("Error fetching all expenses for reports:", err);
      });
    }
  }, []); // Runs once on component mount

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  useEffect(() => {
    // 1. Monthly Trend Processing (uses allExpenses)
    if (allExpenses && allExpenses.length > 0) {
      const monthlyTotals = allExpenses.reduce((acc, expense) => {
        const yearMonth = expense.date.substring(0, 7);
        acc[yearMonth] = (acc[yearMonth] || 0) + expense.amount;
        return acc;
      }, {});

      const trendData = Object.entries(monthlyTotals).map(([yearMonth, total]) => {
        const [year, month] = yearMonth.split('-');
        const dateObj = new DateObject({ date: `${year}-${month}-01`, calendar: "gregorian" });
        const persianMonthName = dateObj.convert(persian, persian_fa).format("MMMM");
        const persianYear = dateObj.convert(persian, persian_fa).format("YYYY");
        return {
          key: yearMonth,
          month: `${persianMonthName} ${persianYear}`,
          total,
        };
      });

      trendData.sort((a, b) => a.key.localeCompare(b.key));
      setMonthlyTrend(trendData);
    } else {
      setMonthlyTrend([]);
    }

    // 2. Spending by Category for current expenses prop (filtered/current month)
    if (expenses && expenses.length > 0) {
      const spendingByCat = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {});
      setCategorySpending(Object.entries(spendingByCat).map(([name, total]) => ({ name, total })));
    } else {
      setCategorySpending([]);
    }

    // 3. User vs Spouse Spending for current expenses prop (filtered/current month)
    if (expenses && expenses.length > 0 && currentUser) {
      const userTotal = expenses
        .filter(exp => exp.userId === currentUser.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      let spouseTotal = 0;
      if (spouseUser) {
        spouseTotal = expenses
          .filter(exp => exp.userId === spouseUser.id)
          .reduce((sum, exp) => sum + exp.amount, 0);
      }
      setUserSpouseComparison({ user: userTotal, spouse: spouseTotal });
    } else {
      setUserSpouseComparison({ user: 0, spouse: 0 });
    }

  }, [expenses, allExpenses, currentUser, spouseUser]); // Add allExpenses to dependency array

  return (
    <div className="space-y-8">
      {/* Section 1 (Previously 3): User vs Spouse Spending */}
      {spouseUser && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-white">
          <h3 className="text-xl font-semibold text-white mb-4">مقایسه هزینه شما و {spouseUser.name} (ماه جاری/فیلتر شده)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 p-3 rounded">
              <p className="text-gray-300">هزینه‌های شما:</p>
              <p className="text-lg font-bold">{formatMoney(userSpouseComparison.user)}</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <p className="text-gray-300">هزینه‌های {spouseUser.name}:</p>
              <p className="text-lg font-bold">{formatMoney(userSpouseComparison.spouse)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Spending by Category */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-white">
        <h3 className="text-xl font-semibold text-white mb-4">هزینه‌ها بر اساس دسته‌بندی (ماه جاری/فیلتر شده)</h3>
        {categorySpending.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              {isMobileView ? (
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="name"
                  >
                    {categorySpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#805AD5', '#38B2AC', '#ED8936', '#4299E1', '#9F7AEA', '#F56565'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={categorySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} />
                  <YAxis tickFormatter={formatMoney} tick={{ fill: '#A0AEC0' }} />
                  <Tooltip
                    formatter={(value) => formatMoney(value)}
                    contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                  <Bar dataKey="total" fill="#805AD5" name="مجموع هزینه" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-400">هزینه‌ای برای نمایش دسته‌بندی‌ها یافت نشد.</p>
        )}
      </div>

      {/* Section 3 (Previously 1): Monthly Spending Trend */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-white">
        <h3 className="text-xl font-semibold text-white mb-4">روند هزینه‌های ماهانه</h3>
        {monthlyTrend.length > 0 ? (
           <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="month" tick={{ fill: '#A0AEC0' }} />
                <YAxis tickFormatter={formatMoney} tick={{ fill: '#A0AEC0' }} width={100} />
                <Tooltip
                  formatter={(value) => formatMoney(value)}
                  contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#E2E8F0' }}
                />
                <Bar dataKey="total" fill="#38B2AC" name="مجموع هزینه" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-400">داده‌ای برای نمایش روند ماهانه موجود نیست.</p>
        )}
      </div>
    </div>
  );
};

export default ReportsView;