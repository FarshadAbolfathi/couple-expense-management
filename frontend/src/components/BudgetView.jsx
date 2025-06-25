import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BudgetView = ({ currentUser, spouseUser, onBudgetUpdate }) => {
  const [userBudget, setUserBudget] = useState(currentUser.monthlyBudget || 0);
  const [spouseBudget, setSpouseBudget] = useState(spouseUser ? spouseUser.monthlyBudget || 0 : 0);
  // Store formatted budget for display, parse on submit
  const [newBudget, setNewBudget] = useState(
    currentUser.monthlyBudget ? new Intl.NumberFormat('fa-IR').format(currentUser.monthlyBudget) : ''
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentFormattedBudget = currentUser.monthlyBudget ? new Intl.NumberFormat('fa-IR').format(currentUser.monthlyBudget) : '';
    setUserBudget(currentUser.monthlyBudget || 0);
    // Only update newBudget from prop if it hasn't been changed by the user,
    // or if it's different from the current user's formatted budget.
    // This prevents overwriting user input if the parent re-renders for other reasons.
    if (newBudget === '' || newBudget !== currentFormattedBudget) {
        setNewBudget(currentFormattedBudget);
    }

    if (spouseUser) {
      setSpouseBudget(spouseUser.monthlyBudget || 0);
    } else {
      setSpouseBudget(0);
    }
  }, [currentUser, spouseUser]); // Removed newBudget from dependency array to avoid loop with local changes

  const handleBudgetChange = (e) => {
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
      setNewBudget('');
    } else {
      try {
        const number = parseInt(numericString, 10);
        if (!isNaN(number)) {
          // Format back to Persian numerals for display
          setNewBudget(new Intl.NumberFormat('fa-IR').format(number));
        } else {
          setNewBudget(''); // Fallback for invalid number
        }
      } catch (error) {
        setNewBudget(''); // Fallback for parsing error
      }
    }
  };

  const handleSubmitBudget = async (e) => {
    e.preventDefault();
    setMessage('');
    // Clean and parse newBudget before submitting
    const toLatinNumerals = (str) => {
      return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    };
    const latinBudget = toLatinNumerals(newBudget);
    const cleanedBudget = latinBudget.replace(/[^0-9]/g, '');
    const budgetValue = parseInt(cleanedBudget, 10);

    if (isNaN(budgetValue) || budgetValue < 0) { // Allow 0 as a valid budget
      setMessage('لطفاً یک مبلغ معتبر برای بودجه وارد کنید.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Assuming an endpoint to update the current user's budget
      await axios.put(
        '/api/user/budget',
        { monthlyBudget: budgetValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('بودجه شما با موفقیت به روز شد.');
      // Notify parent component to refresh user data
      if (onBudgetUpdate) {
        onBudgetUpdate();
      }
    } catch (error) {
      console.error('Error updating budget:', error.response ? error.response.data : error.message);
      setMessage(`خطا در به روز رسانی بودجه: ${error.response && error.response.data && error.response.data.error ? error.response.data.error : 'خطای سرور'}`);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const totalFamilyBudget = userBudget + spouseBudget;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-white">
      <h3 className="text-xl sm:text-2xl font-semibold text-white mb-6">مدیریت بودجه</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="text-lg font-medium mb-2">بودجه شما</h4>
          <p className="text-2xl font-bold">{formatMoney(userBudget)}</p>
        </div>
        {spouseUser && (
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-lg font-medium mb-2">بودجه {spouseUser.name}</h4>
            <p className="text-2xl font-bold">{formatMoney(spouseBudget)}</p>
          </div>
        )}
        <div className={`bg-gray-700 p-4 rounded-lg ${spouseUser ? 'md:col-span-2' : ''}`}>
          <h4 className="text-lg font-medium mb-2">مجموع بودجه خانواده</h4>
          <p className="text-2xl font-bold">{formatMoney(totalFamilyBudget)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmitBudget} className="space-y-4">
        <div>
          <label htmlFor="newBudget" className="block text-sm font-medium text-gray-300 mb-1">
            تغییر بودجه شخصی شما:
          </label>
          <input
            type="text"
            inputMode="decimal" // For better mobile keyboard
            id="newBudget"
            name="newBudget"
            value={newBudget}
            onChange={handleBudgetChange}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="مبلغ جدید بودجه"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          ذخیره بودجه
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm ${message.includes('موفقیت') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default BudgetView;