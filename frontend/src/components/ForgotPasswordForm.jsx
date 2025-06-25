import React, { useState } from 'react';

const ForgotPasswordForm = ({ onBackToLogin, setToastNotification }) => {
  const [email, setEmail] = useState('');
  // const [message, setMessage] = useState(null); // Will use toast
  // const [error, setError] = useState(null); // Will use toast

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setMessage(null); // Clear local messages if any were used before
    // setError(null);
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        if (setToastNotification) setToastNotification({ show: true, message: 'درخواست بازیابی رمز عبور با موفقیت ارسال شد. لطفاً ایمیل خود را بررسی کنید.', type: 'success' });
        
      } else {
        if (setToastNotification) setToastNotification({ show: true, message: data.error || 'خطا در ارسال درخواست بازیابی رمز عبور', type: 'error' });
        
      }
    } catch (err) {
      if (setToastNotification) setToastNotification({ show: true, message: 'خطا در ارتباط با سرور', type: 'error' });
      
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
          <h2 className="text-white text-2xl font-bold mb-6 text-center">بازیابی رمز عبور</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="ایمیل خود را وارد کنید"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            {/* {message && <p className="text-green-400 text-center">{message}</p>} */}
            {/* {error && <p className="text-red-400 text-center">{error}</p>} */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
            >
              ارسال درخواست بازیابی
            </button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={onBackToLogin}
              className="text-gray-400 hover:text-white"
            >
              بازگشت به صفحه ورود
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
