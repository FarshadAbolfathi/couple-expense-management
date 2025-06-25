import React, { useState, useEffect } from 'react';
import DatePicker, { Calendar, DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import {
  Home,
  Wallet,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  Users,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  X, 
  ArrowUp,
  CalendarDays,
  Sun,
  Moon
} from 'lucide-react';
import axios from 'axios';
import AddExpenseForm from './AddExpenseForm';
import CreateSpouseForm from './CreateSpouseForm';
import BudgetView from './BudgetView'; 
import ReportsView from './ReportsView'; 
import SettingsView from './SettingsView'; 
import AdminPanel from './AdminPanel'; 

const Dashboard = ({ currentUser, onLogout, setToastNotification }) => {
  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768; 
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const [userData, setUserData] = useState(currentUser);
  const [spouse, setSpouse] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [filterDate, setFilterDate] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); 
  const initialMenuItems = [
    { id: 'dashboard', name: 'داشبورد', icon: Home },
    { id: 'budget', name: 'بودجه', icon: Target },
    { id: 'reports', name: 'گزارشات', icon: BarChart3 },
    { id: 'settings', name: 'تنظیمات', icon: Settings },
    ...(currentUser.email === 'farshad.code@gmail.com' ? [{ id: 'admin', name: 'پنل ادمین', icon: Users }] : [])
  ];
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateSpouse, setShowCreateSpouse] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthJustClosed, setMonthJustClosed] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [showCloseMonthModal, setShowCloseMonthModal] = useState(false);
  const [newMonthBudgetInput, setNewMonthBudgetInput] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({ message: '', onConfirm: () => { }, onCancel: () => { } });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; // Default to dark mode
  });
  // const [toastNotification, setToastNotification] = useState({ show: false, message: '', type: 'success' }); // Moved to App.jsx

  // Effect to apply theme class to HTML element and save to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // useEffect(() => { // Moved to App.jsx
  //   if (toastNotification.show) {
  //     const timer = setTimeout(() => {
  //       setToastNotification({ ...toastNotification, show: false });
  //     }, 5000); // Auto-dismiss after 5 seconds
  //     return () => clearTimeout(timer);
  //   }
  // }, [toastNotification]);

  // Removed problematic useEffect that was auto-closing sidebar on mobile during re-renders or resize.
  // The useState(!isMobile()) for sidebarOpen handles the initial state correctly.
  // User can now freely toggle the sidebar on mobile using the hamburger menu.

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && currentUser && currentUser.id) { // Ensure there's a logged-in user
      axios.get(`/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => {
          console.log("Fetched user data on mount/currentUser.id change:", res.data);
          setUserData(res.data.user); // Set userData from API
          setSpouse(res.data.spouse);   
        })
        .catch((error) => {
          console.error("Error fetching user data on mount:", error);
          // Fallback to prop if API fails, though this might be stale
          setUserData(currentUser);
          setSpouse(null);
        });
    } else {
      // If no token or currentUser.id, likely means not logged in or initial state
      // Set userData to currentUser prop and spouse to null
      setUserData(currentUser);
      setSpouse(null);
    }
  }, [currentUser.id]); 

  const fetchExpenses = () => {
    if (monthJustClosed && !filterDate) {
      console.log('fetchExpenses: Skipped fetch because month was just closed and no filter is active.');
      return;
    }

    if (userData) {
      let url = `/api/expenses`;
      let year, month, monthPadded;
      if (filterDate) { 
        console.log('fetchExpenses - filterDate (raw state):', filterDate);
        console.log('fetchExpenses - filterDate type:', Object.prototype.toString.call(filterDate));

        let dateObj;
        if (filterDate instanceof DateObject) {
          dateObj = filterDate;
        } else { 
          console.warn('fetchExpenses - filterDate was not a DateObject, attempting to create one.');
          dateObj = new DateObject(filterDate, { calendar: persian }); 
        }
        console.log('fetchExpenses - dateObj (from filterDate):', dateObj, 'Year:', dateObj.year, 'Month:', dateObj.month.number, 'Day:', dateObj.day, 'Calendar:', dateObj.calendar.name);

        const gregorianDate = dateObj.convert("gregorian");
        console.log('fetchExpenses - gregorianDate (after convert):', gregorianDate, 'Year:', gregorianDate.year, 'Month:', gregorianDate.month.number, 'Day:', gregorianDate.day, 'Calendar:', gregorianDate.calendar.name);

        year = gregorianDate.year;
        month = gregorianDate.month.number;
        monthPadded = month < 10 ? '0' + month : month.toString();
        console.log(`Fetching expenses for selected Gregorian year: ${year}, month: ${monthPadded}`);
        url += `?year=${year}&month=${monthPadded}`;
      } else if (userData && userData.currentBudgetPeriodStartDate) { 
        try {
          const latinDateStr = userData.currentBudgetPeriodStartDate.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728));
          const currentPeriodDateObj = new DateObject(latinDateStr, { calendar: persian });
          const gregorianCurrentPeriodDate = currentPeriodDateObj.convert("gregorian");

          year = gregorianCurrentPeriodDate.year;
          month = gregorianCurrentPeriodDate.month.number;
          monthPadded = month < 10 ? '0' + month : month.toString();
          console.log(`Fetching expenses for current budget period (Gregorian year: ${year}, month: ${monthPadded}) because filterDate is null.`);
          url += `?year=${year}&month=${monthPadded}`;
        } catch (e) {
          console.error("Error parsing currentBudgetPeriodStartDate for default fetch:", e);
          console.log('Fetching all expenses due to error in parsing currentBudgetPeriodStartDate and null filterDate.');
        }
      }
      else {
        console.log('Fetching expenses without specific date filter (filterDate is null and no currentBudgetPeriodStartDate). This might fetch all expenses.');
      }
      console.log(`API URL: ${url}`);
      console.log(`Year param type: ${typeof year}, Month param type: ${typeof monthPadded}`);
      axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })
        .then(res => {
          let expensesData = res.data;
          // Map expenses to include userName based on userId
          const expensesWithUserName = expensesData.map(exp => {
            let userName = 'نامشخص';
            if (exp.userName) {
              userName = exp.userName;
            } else if (spouse && exp.userId === spouse.id) {
              userName = spouse.name;
            } else if (exp.userId === userData.id) {
              userName = userData.name;
            }
            return { ...exp, userName };
          });
          setExpenses(expensesWithUserName);

          // Calculate monthly summary
          if (expensesWithUserName.length > 0) {
            const total = expensesWithUserName.reduce((sum, exp) => sum + exp.amount, 0);
            const userTotal = expensesWithUserName.filter(exp => exp.userId === userData.id).reduce((sum, exp) => sum + exp.amount, 0);
            const spouseTotal = spouse ? expensesWithUserName.filter(exp => exp.userId === spouse.id).reduce((sum, exp) => sum + exp.amount, 0) : 0;
            setMonthlySummary({ total, userTotal, spouseTotal });
          } else {
            setMonthlySummary(null); // Clear summary if no expenses for the filtered period
          }
        })
        .catch(() => {
          setExpenses([]);
          setMonthlySummary(null);
        });
    }
  };


  // Debug: log expenses to verify combined expenses
  useEffect(() => {
    console.log('Expenses:', expenses);
  }, [expenses]);



  useEffect(() => {
    fetchExpenses();
  }, [currentUser, spouse, filterDate, monthJustClosed]); // Keep this for initial load and major changes

  useEffect(() => {
    // This effect ensures monthlySummary is updated when expenses change, especially for a filtered view.
    if (filterDate) { // Only if a filter is active
      if (expenses.length > 0) {
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        // Ensure userData and spouse are available for calculation
        const userExpenses = userData ? expenses.filter(exp => exp.userId === userData.id) : [];
        const userTotal = userExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        const spouseExpenses = spouse ? expenses.filter(exp => exp.userId === spouse.id) : [];
        const spouseTotal = spouseExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        setMonthlySummary({ total, userTotal, spouseTotal });
      } else {
        setMonthlySummary(null); // Clear summary if no expenses for the filtered period
      }
    } else {
      // If no filter is active, the specific monthly summary box is not shown.
      // We could set monthlySummary to null here too, or let fetchExpenses handle it
      // For consistency, let's ensure it's null if no filterDate is active,
      // as the summary box is tied to filterDate.
      setMonthlySummary(null);
    }
  }, [expenses, filterDate, userData, spouse]); // Recalculate when these change


  useEffect(() => {
    const checkScrollTop = () => {
      if (!showScrollButton && window.pageYOffset > 300) {
        setShowScrollButton(true);
      } else if (showScrollButton && window.pageYOffset <= 300) {
        setShowScrollButton(false);
      }
    };
    window.addEventListener('scroll', checkScrollTop);
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, [showScrollButton]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMenuItemClick = (viewId) => {
    setActiveView(viewId);
    if (isMobile()) {
      setSidebarOpen(false);
    }
  };

  const handleBudgetUpdated = () => {
    // Re-fetch user data to get the latest budget and other info
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`/api/user`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setUserData(res.data.user);
          setSpouse(res.data.spouse);
        })
        .catch((error) => {
          console.error("Error fetching user data after budget update:", error);
        });
    }
  };


  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const getPersianMonthName = (monthNumber) => {
    const persianMonths = [
      'فروردین',
      'اردیبهشت',
      'خرداد',
      'تیر',
      'مرداد',
      'شهریور',
      'مهر',
      'آبان',
      'آذر',
      'دی',
      'بهمن',
      'اسفند'
    ];
    return persianMonths[monthNumber - 1] || '';
  };

  const getBudgetColor = (percentage) => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 90) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Calculate total budget from currentUser and spouse
  const getTotalBudget = () => {
    // Use userData here as it's updated after closing month
    return (userData.monthlyBudget || 0) + (spouse ? (spouse.monthlyBudget || 0) : 0);
  };

  // Calculate total spending from expenses array for currentUser and spouse separately
  // This function is good for calculating historical/filtered total spending from the 'expenses' list.
  const calculateTotalSpendingFromExpenses = () => {
    const userExpensesTotal = expenses
      .filter(exp => exp.userId === userData.id) // Use userData.id
      .reduce((sum, exp) => sum + exp.amount, 0);
    const spouseExpensesTotal = expenses && spouse
      ? expenses.filter(exp => exp.userId === spouse.id).reduce((sum, exp) => sum + exp.amount, 0)
      : 0;
    return userExpensesTotal + spouseExpensesTotal;
  };

  const totalBudget = getTotalBudget(); // This uses currentUser.monthlyBudget + spouse.monthlyBudget

  // For display of current spending against the budget, use userData.currentSpending and spouse.currentSpending
  // These are reset to 0 by the "Close Month" operation.
  // Calculate spending based on the 'expenses' state, which is correctly filtered
  // for either the selected month or the current budget period.
  const displayYourSpending = expenses
    .filter(exp => userData && exp.userId === userData.id)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const displaySpouseSpending = spouse ? expenses
    .filter(exp => exp.userId === spouse.id)
    .reduce((sum, exp) => sum + exp.amount, 0) : 0;

  const displayTotalCurrentSpending = displayYourSpending + displaySpouseSpending;

  // totalBudgetPercentage should reflect spending against the current active budget
  const totalBudgetPercentage = totalBudget > 0 ? (displayTotalCurrentSpending / totalBudget) * 100 : 0;

  // This is the sum of all expenses currently loaded (can be filtered by month)
  // It's different from displayTotalCurrentSpending which is reset upon closing month.
  const actualTotalExpensesInList = calculateTotalSpendingFromExpenses();

  // Fix: Use yourSpending and spouseSpending for display in cards



  // New: Determine if current user is spouse or main user
  const isSpouse = spouse && userData.id === spouse.id;

  // Show create spouse button only if no spouse
  const showCreateSpouseButton = !userData.spouseId;

  // Adjust labels for budget card
  const budgetTitle = 'بودجه شخصی';
  const combinedBudgetTitle = 'مجموع مصرف شده';

  const displayMonthName = filterDate
    ? `(${filterDate.format("MMMM", persian_fa)})`
    : "(این ماه)";

  const filteredExpenses = expenses.filter(expense => {
    const query = searchQuery.toLowerCase();
    // Ensure properties exist before calling toLowerCase()
    const titleMatch = expense.title && expense.title.toLowerCase().includes(query);
    const categoryMatch = expense.category && expense.category.toLowerCase().includes(query);
    const userNameMatch = expense.userName && expense.userName.toLowerCase().includes(query);
    return titleMatch || categoryMatch || userNameMatch;
  });
  const allExpenses = [...filteredExpenses].sort((a, b) => b.id - a.id);

  const handleAddExpense = async (expenseData) => {
    try {
      // Remove userId from payload, send only expected fields
      const expenseToAdd = { ...expenseData, amount: parseInt(expenseData.amount) };
      const response = await axios.post('/api/expenses', expenseToAdd, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Add expense response:', response);
      setShowAddExpense(false);
      fetchExpenses();
      // Refresh user data to update currentSpending
      axios.get(`/api/user`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })
        .then(res => setUserData(res.data.user))
        .catch(() => setUserData(currentUser));
    } catch (error) {
      console.error('Add expense error:', error);
      setToastNotification({ show: true, message: 'خطا در ثبت هزینه', type: 'error' });
    }
  };


  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowAddExpense(true);
  };

  const handleUpdateExpense = async (expenseData) => {
    try {
      await axios.put(`/api/expenses/${editingExpense.id}`, expenseData);
      setEditingExpense(null);
      setShowAddExpense(false);
      fetchExpenses(); // Updates the expense list and filtered summary

      // Refresh user data to update currentSpending for stats cards
      const token = localStorage.getItem('token');
      if (token) {
        axios.get(`/api/user`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => {
            setUserData(res.data.user);
            setSpouse(res.data.spouse || null); // Ensure spouse is set or nulled
          })
          .catch((error) => {
            console.error("Error fetching user data after expense update:", error);
            // Optional: Fallback to props or previous state if critical, but might be stale
            // setUserData(currentUser);
            // setSpouse(null);
          });
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      setToastNotification({ show: true, message: 'خطا در ویرایش هزینه', type: 'error' });
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmDeletion = async () => {
      try {
        await axios.delete(`/api/expenses/${expenseId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchExpenses();
        // Refresh user data to update currentSpending
        axios.get(`/api/user`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
          .then(res => setUserData(res.data.user))
          .catch(() => setUserData(currentUser)); // Fallback
        if (setToastNotification) setToastNotification({ show: true, message: 'هزینه با موفقیت حذف شد.', type: 'success' });
      } catch (error) {
        console.error('Error deleting expense:', error);
        if (setToastNotification) setToastNotification({ show: true, message: 'خطا در حذف هزینه', type: 'error' });
        else alert('خطا در حذف هزینه'); // Fallback if prop not passed
      }
      setShowConfirmModal(false);
    };

    setConfirmModalProps({
      message: 'آیا از حذف این هزینه مطمئن هستید؟',
      onConfirm: confirmDeletion,
      onCancel: () => setShowConfirmModal(false)
    });
    setShowConfirmModal(true);
  };

  const handleSpouseCreated = (updatedUser) => {
    setSpouse(updatedUser);
    setShowCreateSpouse(false);
    // Also refresh main user data in case spouse creation affected it (e.g. spouseId)
    axios.get(`/api/user`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setUserData(res.data.user))
      .catch(() => setUserData(currentUser));
  };

  const openCloseMonthModal = () => {
    setNewMonthBudgetInput(userData.monthlyBudget != null ? userData.monthlyBudget : ''); // Store number or empty string
    setShowCloseMonthModal(true);
  };

  const executeCloseMonth = async () => {
    const newMonthlyBudget = parseInt(newMonthBudgetInput, 10);

    if (isNaN(newMonthlyBudget) || newMonthlyBudget < 0) {
      alert("لطفاً یک مقدار معتبر برای بودجه وارد کنید.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/budget/close-month',
        { newMonthlyBudget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToastNotification({ show: true, message: 'ماه با موفقیت بسته شد. بودجه به روز شد و هزینه‌ها صفر شدند.', type: 'success' });
      setShowCloseMonthModal(false); // Close modal on success

      // Refresh user data to get updated budget, zeroed spending, and new start date
      axios.get(`/api/user`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const updatedUser = res.data.user;
          const updatedSpouse = res.data.spouse;
          setUserData(updatedUser);
          if (updatedSpouse) {
            setSpouse(updatedSpouse);
          } else {
            setSpouse(null); // Ensure spouse is explicitly null if not present
          }
          setMonthJustClosed(true);
          setFilterDate(null);
          setExpenses([]);
          setMonthlySummary(null);
          console.log("Month closed: monthJustClosed flag set, filterDate set to null, expenses and summary cleared.");
        })
        .catch((error) => {
          console.error("Error fetching user data after closing month:", error);
          setUserData(prev => ({ ...prev, monthlyBudget: newMonthlyBudget, currentSpending: 0 }));
          if (spouse) {
            setSpouse(prev => ({ ...prev, monthlyBudget: newMonthlyBudget, currentSpending: 0 }));
          }
          setMonthJustClosed(false);
          setFilterDate(null);
          setExpenses([]);
          setMonthlySummary(null);
        });
    } catch (error) {
      console.error('Error closing month:', error.response ? error.response.data : error.message);
      setToastNotification({ show: true, message: `خطا در بستن ماه: ${error.response ? error.response.data.error : 'خطای سرور'}`, type: 'error' });
    }
  };

  return (
    <div className={`min-h-screen md:flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`} dir="rtl">
      {/* Sidebar */}
      <div
        className={`fixed ${isMobile() ? 'top-[3.75rem] h-[calc(100vh-3.75rem)]' : 'inset-y-0'}
        right-0
        ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border-l transition-transform duration-300 ease-in-out z-40
        md:static md:translate-x-0 md:h-full md:transition-none
        ${sidebarOpen ? 'translate-x-0 w-3/4 sm:w-64 md:w-64' : 'translate-x-full w-3/4 sm:w-64 md:w-16'} flex flex-col`}
      >
        {/* Content of the sidebar (logo, menu items, user profile) */}
        {isMobile() && sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className={`absolute top-4 left-4 p-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-transform duration-300 ease-in-out hover:rotate-90 z-50`}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        {/* Logo */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>مدیریت هزینه</h1>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>نسخه 1.0</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="mt-6 flex-grow overflow-y-auto">
          {menuItems.map((item, index) => (
            <a
              key={index}
              href="#"
              onClick={() => handleMenuItemClick(item.id)}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors
                          ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                          ${activeView === item.id ?
                (isDarkMode ? 'bg-gray-700 text-white border-purple-500' : 'bg-gray-200 text-purple-600 border-purple-600') + ' border-l-4' :
                (isDarkMode ? 'text-gray-300' : 'text-gray-600')
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeView === item.id ? (isDarkMode ? 'text-white' : 'text-purple-600') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`} />
              {sidebarOpen && <span>{item.name}</span>}
            </a>
          ))}
        </nav>

        {/* User Profile */}
        <div className={`w-full border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${sidebarOpen ? 'p-6' : 'p-3'}`}>
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            {sidebarOpen && (
              <>
                <div className={`w-10 h-10 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded-full flex items-center justify-center text-lg`}>
                  {userData.avatarUrl ? (
                    <img src={`${userData.avatarUrl}`} alt="User Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '👨‍💼'
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{userData.name}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userData.email}</p>
                </div>
              </>
            )}
            {/* Logout button */}
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
              }}
              className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} cursor-pointer ${!sidebarOpen && 'mx-auto'}`}
              title="خروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`md:flex-1 md:min-w-0 overflow-hidden ${isDarkMode ? '' : 'bg-gray-50'}`}>
        {/* Top Bar */}
        <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 md:px-6 py-3 ${isMobile() ? 'fixed top-0 right-0 left-0 z-50' : 'relative md:static'}`}>
          <div className="flex items-center justify-between">
            {/* Left side of header: Hamburger and Title */}
            <div className="flex items-center flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-all duration-300 ease-in-out z-50
                    ${isMobile() ?
                    (sidebarOpen ? 'opacity-0 pointer-events-none ml-2' : 'opacity-100 mr-2') :
                    'md:static'
                  }`}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} ${isMobile() ? 'text-center w-full' : 'ml-3 md:ml-4'}`}>
                {menuItems.find(item => item.id === activeView)?.name || 'داشبورد'}
              </h2>
            </div>

            {/* Right side of header: Theme Toggle and Bell */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-200 hover:bg-gray-300 text-indigo-600'} transition-colors`}
                title={isDarkMode ? "حالت روشن" : "حالت تاریک"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors relative`}>
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
       <main className={`p-6 ${isMobile() ? 'pt-20' : ''}`}>
          {activeView === 'dashboard' && (
            <>
              {/* Combined Budget Progress Card */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {spouse ? 'بودجه کل خانواده' : 'بودجه شخصی'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {totalBudgetPercentage >= 95 ? (
                        <AlertTriangle className="text-red-400 w-6 h-6" />
                      ) : totalBudgetPercentage >= 90 ? (
                        <AlertTriangle className="text-orange-400 w-6 h-6" />
                      ) : (
                        <CheckCircle className="text-green-400 w-6 h-6" />
                      )}
                    </div>
                  </div>

                  {totalBudget > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm sm:text-base font-medium text-white">مجموع مصرف شده {displayMonthName}</span>
                        <span className={`text-md sm:text-lg font-bold ${totalBudgetPercentage >= 95 ? 'text-red-400' : totalBudgetPercentage >= 90 ? 'text-orange-400' : 'text-green-400'}`}>
                          {totalBudgetPercentage.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-400">مصرف شده {displayMonthName}: {formatMoney(displayTotalCurrentSpending)}</span>
                        <span className="text-gray-400">کل بودجه: {formatMoney(totalBudget)}</span>
                      </div>

                      <div className="w-full bg-gray-700 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${getBudgetColor(totalBudgetPercentage)} transition-all duration-500`}
                          style={{ width: `${Math.min(totalBudgetPercentage, 100)}%` }}
                        ></div>
                      </div>

                      {spouse && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-gray-400">هزینه‌های شما {displayMonthName}</p>
                            <p className="text-md sm:text-lg font-semibold text-white">{formatMoney(displayYourSpending)}</p>
                            <p className="text-xs text-gray-500">از {formatMoney(userData.monthlyBudget)} بودجه</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-gray-400">هزینه‌های {spouse.name} {displayMonthName}</p>
                            <p className="text-md sm:text-lg font-semibold text-white">{formatMoney(displaySpouseSpending)}</p>
                            <p className="text-xs text-gray-500">از {formatMoney(spouse.monthlyBudget)} بودجه</p>
                          </div>
                        </div>
                      )}

                      {!spouse && showCreateSpouseButton && (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 mb-4">حساب همسر خود را ایجاد کنید</p>
                          <button
                            onClick={() => setShowCreateSpouse(true)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                          >
                            ایجاد حساب همسر
                          </button>
                        </div>
                      )}

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-xs sm:text-sm">مجموع هزینه‌ها {displayMonthName}</p>
                              <p className="text-xl sm:text-2xl font-bold text-white">{formatMoney(displayTotalCurrentSpending)}</p>
                            </div>
                            <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-100 text-xs sm:text-sm">هزینه‌های شما {displayMonthName}</p>
                              <p className="text-xl sm:text-2xl font-bold text-white">{formatMoney(displayYourSpending)}</p>
                            </div>
                            <Target className="w-6 h-6 sm:w-8 sm:h-8 text-green-200" />
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-100 text-xs sm:text-sm">{spouse ? `هزینه‌های ${spouse.name} ${displayMonthName}` : `هزینه‌های همسر ${displayMonthName}`}</p>
                              <p className="text-xl sm:text-2xl font-bold text-white">{formatMoney(displaySpouseSpending)}</p>
                            </div>
                            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200" />
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-orange-100 text-xs sm:text-sm">باقی‌مانده بودجه {displayMonthName}</p>
                              <p className="text-xl sm:text-2xl font-bold text-white">{formatMoney(totalBudget - displayTotalCurrentSpending)}</p>
                            </div>
                            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-200" />
                          </div>
                        </div>
                      </div>

                      {/* Recent Expenses Table */}
                      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border`}>
                        <div className={`flex flex-col p-4 md:p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} gap-4`}>
                          <div className="w-full">
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-center md:text-right`}>آخرین هزینه‌ها</h3>
                            {userData && userData.currentBudgetPeriodStartDate && (
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 text-center md:text-right`}>
                                تاریخ شروع ماه جاری: {userData.currentBudgetPeriodStartDate}
                              </p>
                            )}
                          </div>

                          {/* Combined Controls Row for Desktop, Stacked for Mobile */}
                          <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-4 w-full">
                            {/* Buttons Group - Placed first for desktop order, but will be re-ordered by flex on mobile if needed or styled separately */}
                            <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                              <button className={`w-1/2 md:w-auto flex items-center justify-center gap-2 ${isDarkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white px-4 py-2 rounded-lg transition-colors`} onClick={() => setShowAddExpense(true)}>
                                <Plus className="w-4 h-4" />
                                <span className="whitespace-nowrap">افزودن هزینه</span>
                              </button>
                              <button
                                onClick={openCloseMonthModal}
                                className={`w-1/2 md:w-auto flex items-center justify-center gap-2 ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg transition-colors`}
                              >
                                <Wallet className="w-4 h-4" />
                                <span className="whitespace-nowrap">بستن ماه</span> {/* Shortened for mobile if needed, or use whitespace-nowrap */}
                              </button>
                            </div>

                            {/* Search and Filter Group - Appears after buttons on desktop */}
                            <div className="flex items-center gap-2 w-full md:flex-1">
                              <div className="relative flex-grow">
                                <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} pointer-events-none`} />
                                <input
                                  type="text"
                                  placeholder="جستجو..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className={`w-full ${isDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg px-10 py-2 focus:ring-purple-500 focus:border-purple-500`}
                                />
                              </div>
                              <div className="flex-shrink-0">
                                <DatePicker
                                  calendar={persian}
                                  locale={persian_fa}
                                  onlyMonthPicker
                                  value={filterDate ? new DateObject(filterDate) : null}
                                  key={filterDate ? filterDate.format("YYYYMM") : "no-date"}
                                  onChange={selectedDateObject => {
                                    setMonthJustClosed(false);
                                    if (selectedDateObject instanceof DateObject) {
                                      console.log("DatePicker onChange - received selectedDateObject:", selectedDateObject, 'Year:', selectedDateObject.year, 'Month:', selectedDateObject.month.number, 'Day:', selectedDateObject.day, 'Calendar:', selectedDateObject.calendar.name);
                                      let correctedDate = new DateObject(selectedDateObject);
                                      if (correctedDate.year === 782 || correctedDate.year === 785) {
                                        console.warn(`DatePicker onChange - received suspicious year ${correctedDate.year}. Attempting to correct.`);
                                        let targetYear;
                                        if (userData && userData.currentBudgetPeriodStartDate) {
                                          try {
                                            const latinDateStr = userData.currentBudgetPeriodStartDate.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728));
                                            targetYear = new DateObject(latinDateStr, { calendar: persian }).year;
                                          } catch (e) {
                                            targetYear = new DateObject({ calendar: persian }).year;
                                          }
                                        } else {
                                          targetYear = new DateObject({ calendar: persian }).year;
                                        }
                                        correctedDate.setYear(targetYear);
                                      }
                                      const finalPersianDate = correctedDate.calendar.name === persian.name ? correctedDate : correctedDate.setCalendar(persian);
                                      setFilterDate(finalPersianDate);
                                    } else if (selectedDateObject === null) {
                                      setFilterDate(null);
                                    } else {
                                      setFilterDate(null);
                                    }
                                  }}
                                  calendarPosition="bottom-right"
                                  format="MMMM YYYY"
                                  render={(inputValue, openCalendar) => (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof openCalendar === 'function') {
                                          openCalendar();
                                        } else {
                                          console.error("DatePicker's openCalendar function is not available.");
                                        }
                                      }}
                                      className={`flex items-center justify-center gap-2 ${isDarkMode ? 'bg-gray-700/50 border-gray-600 hover:border-purple-500 text-white' : 'bg-white border-gray-300 hover:border-purple-500 text-gray-700'} border px-3 py-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                    >
                                      <CalendarDays className="w-4 h-4" />
                                      <span className="whitespace-nowrap">
                                        {filterDate instanceof DateObject ? filterDate.format("MMMM", persian_fa) : "فیلتر"}
                                      </span>
                                    </button>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {filterDate && (
                          <div className={`p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            {monthlySummary ? (
                              <>
                                <p className="text-xs sm:text-sm">کل هزینه ماه {getPersianMonthName(filterDate.month.number)} {filterDate.format("YYYY")} : {formatMoney(monthlySummary.total)}</p>
                                <p className="text-xs sm:text-sm">هزینه {userData.name}: {formatMoney(monthlySummary.userTotal)}</p>
                                {spouse && <p className="text-xs sm:text-sm">هزینه {spouse.name}: {formatMoney(monthlySummary.spouseTotal)}</p>}
                              </>
                            ) : (
                              <p className="text-xs sm:text-sm">هزینه ثبت نشده است برای ماه مد نظر شما</p>
                            )}
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <th className={`text-right p-2 sm:p-4 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>عنوان</th>
                                <th className={`text-right p-2 sm:p-4 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>مبلغ</th>
                                <th className={`text-right p-2 sm:p-4 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>دسته‌بندی</th>
                                <th className={`text-right p-2 sm:p-4 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>تاریخ</th>
                                <th className={`text-right p-2 sm:p-4 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>کاربر</th>
                                <th className={`text-right p-2 sm:p-4 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>عملیات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allExpenses.length > 0 ? allExpenses.map((expense) => (
                                <tr key={expense.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                  <td className={`p-2 sm:p-4 text-xs sm:text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{expense.title}</td>
                                  <td className={`p-2 sm:p-4 text-xs sm:text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatMoney(expense.amount)}</td>
                                  <td className="p-2 sm:p-4 text-xs sm:text-sm">
                                    <span className={`${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full text-xs`}>
                                      {expense.category}
                                    </span>
                                  </td>
                                  <td className={`p-2 sm:p-4 text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{expense.date}</td>
                                  <td className="p-2 sm:p-4 text-xs sm:text-sm">
                                    <span className={`${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'} px-2 py-1 rounded-full text-xs`}>
                                      {expense.userName}
                                    </span>

                                  </td>
                                  <td className="p-2 sm:p-4">
                                    <div className="flex items-center gap-2">
                                      <button className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`} onClick={() => handleEditExpense(expense)}>
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`} onClick={() => handleDeleteExpense(expense.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan="6" className={`p-4 sm:p-8 text-center text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    هیچ هزینه‌ای ثبت نشده است
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Scroll to Top Button */}
                      {isMobile() && showScrollButton && (
                        <button
                          onClick={scrollToTop}
                          className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-opacity duration-300 ease-in-out z-50"
                          aria-label="Scroll to top"
                        >
                          <ArrowUp className="w-6 h-6" />
                          </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

        {activeView === 'budget' && (
          <BudgetView
            currentUser={userData}
            spouseUser={spouse}
            onBudgetUpdate={handleBudgetUpdated}
            isDarkMode={isDarkMode}
          />
        )}

        {activeView === 'reports' && (
          <ReportsView
            currentUser={userData}
            spouseUser={spouse}
            expenses={expenses}
            isDarkMode={isDarkMode}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            currentUser={userData}
            onUpdateUser={handleBudgetUpdated} // Re-using handleBudgetUpdated as it fetches all user data
            isDarkMode={isDarkMode}
          />
        )}

        {activeView === 'admin' && currentUser.email === 'farshad.code@gmail.com' && (
          <AdminPanel currentUser={userData} isDarkMode={isDarkMode} />
        )}

        {/* Add Expense Modal */}
        {showAddExpense && (
          <AddExpenseForm
            token={localStorage.getItem('token')}
            onExpenseAdded={() => {
              setShowAddExpense(false);
              setEditingExpense(null);
              fetchExpenses();
            }}
            onUpdateExpense={() => {
              setShowAddExpense(false);
              setEditingExpense(null);
              fetchExpenses();
            }}
            onCancel={() => {
              setShowAddExpense(false);
              setEditingExpense(null);
            }}
            initialData={editingExpense || null}
            isDarkMode={isDarkMode}
            setToastNotification={setToastNotification}
          />

        )}

        {/* Create Spouse Modal */}
        {showCreateSpouse && (
          <CreateSpouseForm
            token={localStorage.getItem('token')}
            currentUser={currentUser}
            onSpouseCreated={handleSpouseCreated}
            onCancel={() => setShowCreateSpouse(false)}
            isDarkMode={isDarkMode}
            setToastNotification={setToastNotification}
          />
        )}

        {/* Close Month Modal */}
        {showCloseMonthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-2xl w-full max-w-md`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>بستن ماه و تنظیم بودجه جدید</h3>
                <button onClick={() => setShowCloseMonthModal(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div>
                <label htmlFor="newMonthBudget" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  بودجه ماه جدید (تومان)
                </label>
                <input
                  type="text"
                  id="newMonthBudget"
                  name="newMonthBudget"
                  value={newMonthBudgetInput === '' ? '' : new Intl.NumberFormat('fa-IR').format(Number(newMonthBudgetInput))}
                  onChange={(e) => {
                    let inputValue = e.target.value;

                    // Normalize Persian/Arabic digits to Latin digits
                    inputValue = inputValue.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728));
                    inputValue = inputValue.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1584)); // Arabic digits

                    // Remove any non-digit characters (like commas, spaces, etc.)
                    const rawNumericString = inputValue.replace(/[^\d]/g, '');

                    if (rawNumericString === '') {
                      setNewMonthBudgetInput('');
                    } else {
                      const numberValue = parseInt(rawNumericString, 10);
                      if (!isNaN(numberValue)) {
                        setNewMonthBudgetInput(numberValue);
                      } else {
                        // If parsing results in NaN (e.g., due to unexpected input),
                        // reset to empty or keep previous valid state. Here, resetting to empty.
                        setNewMonthBudgetInput('');
                      }
                    }
                  }}
                  className={`w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg p-3 focus:ring-purple-500 focus:border-purple-500`}
                  placeholder="مثال: 20,000,000"
                  dir="ltr" // Ensure LTR for number input with formatting
                />
              </div>
              <div className="mt-8 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowCloseMonthModal(false)}
                  className={`px-6 py-2 rounded-lg ${isDarkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'} transition-colors`}
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={executeCloseMonth}
                  className={`px-6 py-2 rounded-lg ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
                >
                  تایید و بستن ماه
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4" dir="rtl">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-2xl w-full max-w-sm`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4 text-center`}>تایید عملیات</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-6 text-center`}>{confirmModalProps.message}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    confirmModalProps.onCancel();
                    setShowConfirmModal(false);
                  }}
                  className={`px-6 py-2 rounded-lg ${isDarkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'} transition-colors`}
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    confirmModalProps.onConfirm();
                    // setShowConfirmModal(false); // onConfirm should handle this
                  }}
                  className={`px-6 py-2 rounded-lg ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
                >
                  تایید حذف
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
</div>
  );
};

export default Dashboard;
