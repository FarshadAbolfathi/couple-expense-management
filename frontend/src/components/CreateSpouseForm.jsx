import React, { useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react'; // Import Copy and CheckCircle icons

const CreateSpouseForm = ({ token, onSpouseCreated, onCancel, setToastNotification }) => {
  const [spouseForm, setSpouseForm] = useState({
    name: '',
    email: '',
    password: '',
    monthlyBudget: '' // Stores raw numeric string
  });
  const [displayMonthlyBudget, setDisplayMonthlyBudget] = useState(''); // Stores formatted string for display
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdSpouseInfo, setCreatedSpouseInfo] = useState({ email: '', password: '', apiResponse: null });
  const [copied, setCopied] = useState(false);

  const toLatinNumerals = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
              .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  };

  const formatCurrency = (value) => {
    // Ensure value is a string of Latin digits before parsing
    const latinNumericString = toLatinNumerals(String(value)).replace(/[^0-9]/g, '');
    if (latinNumericString === '') return '';
    
    const num = parseInt(latinNumericString, 10);
    if (isNaN(num)) return '';
    
    return num.toLocaleString('fa-IR'); // This will output Persian numerals with commas
  };

  const handleBudgetChange = (e) => {
    const inputValue = e.target.value;
    
    // 1. Convert any Persian/Arabic numerals in the input to Latin numerals
    const latinInputValue = toLatinNumerals(inputValue);
    
    // 2. Keep only Latin digits for the actual state (raw numeric string)
    const rawNumericValue = latinInputValue.replace(/[^0-9]/g, '');
    
    setSpouseForm({ ...spouseForm, monthlyBudget: rawNumericValue });
    
    // 3. Format this raw Latin numeric string for display (will convert to Persian numerals with commas)
    setDisplayMonthlyBudget(formatCurrency(rawNumericValue));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!spouseForm.name || !spouseForm.email || !spouseForm.password || !spouseForm.monthlyBudget) {
      if (setToastNotification) setToastNotification({ show: true, message: 'لطفاً همه فیلدها را پر کنید', type: 'error' });
      else alert('لطفاً همه فیلدها را پر کنید');
      return;
    }
    try {
      const response = await fetch('/api/spouse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: spouseForm.name,
          email: spouseForm.email,
          password: spouseForm.password,
          monthlyBudget: parseInt(spouseForm.monthlyBudget, 10) // Send the raw numeric value
        })
      });
      if (!response.ok) {
        const message = 'خطا در ایجاد حساب همسر';
        let specificMessage = message;
        if (response.status === 401) {
          specificMessage = 'شما اجازه دسترسی ندارید. لطفاً وارد شوید.';
        } else if (response.status === 400) {
          try {
            const data = await response.json();
            specificMessage = data.error || message;
          } catch (e) { /* Do nothing, use default message */ }
        }
        if (setToastNotification) setToastNotification({ show: true, message: specificMessage, type: 'error' });
        else alert(specificMessage);
        return;
      }
      const newSpouse = await response.json();
      // Instead of calling onSpouseCreated directly, show credentials modal
      setCreatedSpouseInfo({
        email: spouseForm.email, // Use email from form as API might not return it or it might be different
        password: spouseForm.password, // Plain text password from form
        apiResponse: newSpouse
      });
      setShowCredentialsModal(true);
      // onSpouseCreated(newSpouse); // This will be called when user closes the credentials modal
    } catch (error) {
      if (setToastNotification) setToastNotification({ show: true, message: 'خطا در ارتباط با سرور', type: 'error' });
      else alert('خطا در ارتباط با سرور');
    }
  };

  const handleCopyCredentials = () => {
    const credentialsText = `ایمیل: ${createdSpouseInfo.email}\nرمز عبور: ${createdSpouseInfo.password}`;
    navigator.clipboard.writeText(credentialsText).then(() => {
      setCopied(true);
      if(setToastNotification) setToastNotification({ show: true, message: 'اطلاعات کاربری کپی شد!', type: 'success' });
      setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
    }).catch(err => {
      console.error('Failed to copy credentials: ', err);
      if(setToastNotification) setToastNotification({ show: true, message: 'خطا در کپی اطلاعات!', type: 'error' });
    });
  };

  const handleCloseCredentialsModal = () => {
    setShowCredentialsModal(false);
    if (createdSpouseInfo.apiResponse) {
      onSpouseCreated(createdSpouseInfo.apiResponse);
    }
  };

  if (showCredentialsModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4" dir="rtl">
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">حساب همسر با موفقیت ایجاد شد!</h2>
          <p className="text-gray-300 text-sm mb-6 text-center">این اطلاعات را برای ورود همسرتان ذخیره کنید:</p>
          
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-400">ایمیل (نام کاربری):</label>
              <p className="text-white bg-gray-700 p-2 rounded-md break-all">{createdSpouseInfo.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400">رمز عبور:</label>
              <p className="text-white bg-gray-700 p-2 rounded-md break-all">{createdSpouseInfo.password}</p>
            </div>
          </div>

          <button
            onClick={handleCopyCredentials}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 rounded-lg text-white transition-colors duration-150 ease-in-out
                        ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'کپی شد!' : 'کپی کردن اطلاعات'}
          </button>

          <button
            onClick={handleCloseCredentialsModal}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg transition-colors"
          >
        متوجه شدم 
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-4 text-center">ایجاد حساب همسر</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="نام و نام خانوادگی همسر"
              value={spouseForm.name}
              onChange={(e) => setSpouseForm({ ...spouseForm, name: e.target.value })}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <input
              type="email"
              placeholder="ایمیل همسر"
              value={spouseForm.email}
              onChange={(e) => setSpouseForm({ ...spouseForm, email: e.target.value })}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="رمز عبور"
              value={spouseForm.password}
              onChange={(e) => {
                const persianRegex = /[\u0600-\u06FF]/;
                const value = e.target.value;
                if (persianRegex.test(value)) {
                  if (setToastNotification) {
                    setToastNotification({ show: true, message: 'لطفا رمز عبور را به انگلیسی وارد کنید.', type: 'error' });
                  }
                  // Do not update state if Persian char is present
                } else {
                  setSpouseForm({ ...spouseForm, password: value });
                }
              }}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="relative">
            <input
              type="text" // Changed to text to allow custom formatting
              placeholder="بودجه ماهانه همسر"
              value={displayMonthlyBudget} // Display formatted value
              onChange={handleBudgetChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-xl pl-16 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">تومان</span>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-xl transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
            >
              ایجاد حساب همسر
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSpouseForm;