import React, { useState } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const RegisterForm = ({ onRegisterSuccess, onSwitchToLogin, setToastNotification }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    monthlyBudget: '' // Stores raw numeric string
  });
  const [displayMonthlyBudget, setDisplayMonthlyBudget] = useState(''); // Stores formatted string for display
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const persianRegex = /[\u0600-\u06FF]/;

    if (name === 'password' || name === 'confirmPassword') {
      if (persianRegex.test(value)) {
        if (setToastNotification) {
          setToastNotification({ show: true, message: 'لطفا رمز عبور را به انگلیسی وارد کنید.', type: 'error' });
        }
        // Do not update the form state for this field if Persian characters are present
        return;
      }
    }
    setForm({...form, [name]: value});
  };

  const toLatinNumerals = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
              .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  };

  const handleBudgetChange = (e) => {
    const inputValue = e.target.value;
    const latinInputValue = toLatinNumerals(inputValue);
    const rawNumericValue = latinInputValue.replace(/[^0-9]/g, '');

    setForm({ ...form, monthlyBudget: rawNumericValue });

    if (rawNumericValue === '') {
      setDisplayMonthlyBudget('');
    } else {
      try {
        const number = parseInt(rawNumericValue, 10);
        if (!isNaN(number)) {
          setDisplayMonthlyBudget(new Intl.NumberFormat('fa-IR').format(number));
        } else {
          setDisplayMonthlyBudget('');
        }
      } catch (error) {
        setDisplayMonthlyBudget('');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      if (setToastNotification) setToastNotification({ show: true, message: 'رمز عبور و تکرار آن یکسان نیستند', type: 'error' });
      else alert('رمز عبور و تکرار آن یکسان نیستند'); // Fallback
      return;
    }
    try {
      const response = await axios.post('/api/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        monthlyBudget: parseInt(form.monthlyBudget, 10) // Ensure base 10 and use raw value
      });
      // Pass the original password, not the hashed one, for auto-login
      onRegisterSuccess(response.data, form.email, form.password);
    } catch (error) {
      if (setToastNotification) setToastNotification({ show: true, message: error.response?.data?.error || 'خطا در ثبت نام', type: 'error' });
      else alert(error.response?.data?.error || 'خطا در ثبت نام'); // Fallback
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">ثبت نام</h1>
            <p className="text-gray-400">ایجاد حساب کاربری جدید</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <input
                type="text"
                name="name"
                placeholder="نام و نام خانوادگی"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="ایمیل"
                value={form.email}
                onChange={handleChange}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="رمز عبور"
                value={form.password}
                onChange={handleChange}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="تکرار رمز عبور"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div>
              <input
                type="text"
                name="monthlyBudget"
                placeholder="بودجه ماهانه (تومان)"
                value={displayMonthlyBudget}
                onChange={handleBudgetChange}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
            >
              ثبت نام
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              قبلاً ثبت نام کرده‌اید؟{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                ورود
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
