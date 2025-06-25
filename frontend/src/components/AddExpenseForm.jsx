import React, { useState } from 'react';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const categories = ['خوراک', 'قبوض', 'حمل و نقل', 'پوشاک', 'تفریح', 'سایر'];

const AddExpenseForm = ({ onExpenseAdded, onUpdateExpense, onCancel, token, initialData, setToastNotification }) => {
  const [title, setTitle] = useState(initialData ? initialData.title : '');
  // Store formatted amount for display, parse on submit
  const [amount, setAmount] = useState(initialData ? new Intl.NumberFormat('fa-IR').format(initialData.amount) : '');
  const [category, setCategory] = useState(initialData ? initialData.category : categories[0]);
  const [date, setDate] = useState(initialData && initialData.date ? new DateObject({ date: initialData.date, calendar: persian, locale: persian_fa }) : null);
  const [user, setUser] = useState(initialData ? initialData.userType : 'خود');

  const handleAmountChange = (e) => {
    const rawValue = e.target.value;

    // Helper to convert Persian/Arabic numerals to Latin
    const toLatinNumerals = (str) => {
      return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    };

    // 1. Convert all numerals to Latin for consistent processing
    const latinRawValue = toLatinNumerals(rawValue);

    // 2. Remove non-Latin-digit characters (keeping only 0-9)
    const numericString = latinRawValue.replace(/[^0-9]/g, '');

    if (numericString === '') {
      setAmount('');
    } else {
      try {
        const number = parseInt(numericString, 10);
        if (!isNaN(number)) {
          // Format back to Persian numerals for display
          setAmount(new Intl.NumberFormat('fa-IR').format(number));
        } else {
          setAmount(''); // Fallback for invalid number
        }
      } catch (error) {
        setAmount(''); // Fallback for parsing error
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Clean and parse amount before submitting
    const toLatinNumerals = (str) => {
      return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    };
    const latinAmount = toLatinNumerals(amount);
    const cleanedAmount = latinAmount.replace(/[^0-9]/g, '');
    const numericAmount = parseInt(cleanedAmount, 10);

    if (!title || !cleanedAmount || isNaN(numericAmount) || numericAmount <= 0 || !category || !date) {
      if (setToastNotification) setToastNotification({ show: true, message: 'لطفاً همه فیلدها را به درستی پر کنید و مبلغ باید بیشتر از صفر باشد.', type: 'error' });
      else alert('لطفاً همه فیلدها را به درستی پر کنید و مبلغ باید بیشتر از صفر باشد.');
      return;
    }
    try {
      // Convert date to Gregorian before formatting
      const gregorianDate = date.convert("gregorian");
      const formattedDate = gregorianDate.format("YYYY-MM-DD");
      const payload = {
        title,
        amount: numericAmount,
        category,
        date: formattedDate,
        user
      };

      if (initialData) {
        // Editing existing expense
        const response = await fetch(`/api/expenses/${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          let message = 'خطا در ویرایش هزینه';
          if (response.status === 401) message = 'شما اجازه دسترسی ندارید. لطفاً وارد شوید.';
          else if (response.status === 403) message = 'شما اجازه انجام این عملیات را ندارید.';
          
          if (setToastNotification) setToastNotification({ show: true, message, type: 'error' });
          else alert(message);
          return;
        }
        const updatedExpense = await response.json();
        onUpdateExpense(updatedExpense);
      } else {
        // Adding new expense
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          let message = 'خطا در ثبت هزینه';
          if (response.status === 401) message = 'شما اجازه دسترسی ندارید. لطفاً وارد شوید.';
          else if (response.status === 403) message = 'شما اجازه انجام این عملیات را ندارید.';

          if (setToastNotification) setToastNotification({ show: true, message, type: 'error' });
          else alert(message);
          return;
        }
        const newExpense = await response.json();
        onExpenseAdded(newExpense);
      }
      setTitle('');
      setAmount('');
      setCategory(categories[0]);
      setDate(null);
      setUser('خود');
    } catch (error) {
      if (setToastNotification) setToastNotification({ show: true, message: 'خطا در ارتباط با سرور', type: 'error' });
      else alert('خطا در ارتباط با سرور');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 w-full max-w-md mx-4 sm:mx-0"> {/* Added mx-4 for small screens */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="عنوان هزینه"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <input
              type="text"
              inputMode="decimal" // For better mobile keyboard
              placeholder="مبلغ (تومان)"
              value={amount}
              onChange={handleAmountChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={date}
              onChange={setDate}
              inputClass="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="تاریخ"
              required
              calendarPosition="bottom-right"
            />
          </div>
          <div>
            <select
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="خود">خود</option>
              <option value="همسر">همسر</option>
              {/* <option value="مشترک">مشترک</option> */}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-xl transition-colors order-2 sm:order-1"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 order-1 sm:order-2"
            >
              {initialData ? 'ویرایش هزینه' : 'افزودن هزینه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseForm;