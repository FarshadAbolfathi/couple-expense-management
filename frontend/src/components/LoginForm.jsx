import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Heart } from 'lucide-react';
import ForgotPasswordForm from './ForgotPasswordForm';

const LoginForm = ({ onLoginSuccess, onSwitchToRegister, pendingCredentials, clearPendingCredentials, setToastNotification }) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // const formRef = React.useRef(null); // Not strictly needed for direct function call

  // Internal login logic to be callable programmatically
  const handleLoginInternal = async (email, password, rememberMeValue) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (rememberMeValue) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('savedEmail', email);
          localStorage.setItem('savedPassword', password);
        } else {
          localStorage.removeItem('savedEmail');
          localStorage.removeItem('savedPassword');
        }
        onLoginSuccess(data.user, data.token);
      } else {
        if (setToastNotification) setToastNotification({ show: true, message: data.error || 'خطا در ورود', type: 'error' });
        else alert(data.error || 'خطا در ورود'); // Fallback if prop not provided
      }
    } catch (error) {
      console.error("Login API error:", error);
      if (setToastNotification) setToastNotification({ show: true, message: 'خطا در ارتباط با سرور', type: 'error' });
      else alert('خطا در ارتباط با سرور'); // Fallback
    }
  };

  useEffect(() => {
    if (pendingCredentials && pendingCredentials.email && pendingCredentials.password) {
      console.log("LoginForm: Received pending credentials for auto-login", pendingCredentials);
      const autoLoginEmail = pendingCredentials.email;
      const autoLoginPassword = pendingCredentials.password;
      const autoLoginRememberMe = pendingCredentials.rememberMe || true;

      setLoginForm({
        email: autoLoginEmail,
        password: autoLoginPassword,
        rememberMe: autoLoginRememberMe,
      });

      setTimeout(() => {
        console.log("LoginForm: Attempting auto-submit for auto-login");
        handleLoginInternal(autoLoginEmail, autoLoginPassword, autoLoginRememberMe);
      }, 0); // Timeout ensures state is set if form submission relies on it, though direct call is fine.
      if (clearPendingCredentials) clearPendingCredentials();
    } else {
      const savedEmail = localStorage.getItem('savedEmail') || '';
      const savedPassword = localStorage.getItem('savedPassword') || '';
      if (savedEmail && savedPassword) {
        setLoginForm(prev => ({ ...prev, email: savedEmail, password: savedPassword, rememberMe: true }));
      }
      // Initial auto-login from token is likely handled by App.jsx, so removed from here to avoid conflicts.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCredentials, clearPendingCredentials]); // onLoginSuccess removed as it might cause loops if App.jsx also handles initial load

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    await handleLoginInternal(loginForm.email, loginForm.password, loginForm.rememberMe);
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} setToastNotification={setToastNotification} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">مدیریت هزینه‌های زوج‌ها</h1>
            <p className="text-gray-400">ورود به حساب کاربری</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="ایمیل"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="رمز عبور"
                value={loginForm.password}
                onChange={(e) => {
                  const persianRegex = /[\u0600-\u06FF]/;
                  const value = e.target.value;
                  if (persianRegex.test(value)) {
                    if (setToastNotification) {
                      setToastNotification({ show: true, message: 'لطفا رمز عبور را به انگلیسی وارد کنید.', type: 'error' });
                    }
                    // Optionally, you could strip the Persian chars or revert to previous value
                    // For now, we just don't update the state if Persian char is present
                    // This effectively prevents typing them if the state drives the input value.
                    // To make it more user-friendly, you might want to filter out the Persian char:
                    // const filteredValue = value.replace(persianRegex, '');
                    // setLoginForm({ ...loginForm, password: filteredValue });
                  } else {
                    setLoginForm({ ...loginForm, password: value });
                  }
                }}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={loginForm.rememberMe}
                  onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                  className="ml-2" // Adjusted for RTL
                />
                <label htmlFor="rememberMe" className="text-gray-400 text-sm cursor-pointer select-none">
                  مرا بخاطر بسپار
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                فراموشی رمز عبور؟
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
            >
              ورود
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              آیا حساب کاربری ندارید؟{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                ثبت نام کنید
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
