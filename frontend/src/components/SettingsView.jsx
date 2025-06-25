import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Edit3, Camera } from 'lucide-react';

const SettingsView = ({ currentUser, onUpdateUser }) => {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatarUrl ? `${currentUser.avatarUrl}` : null);
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setAvatarPreview(currentUser.avatarUrl ? `${currentUser.avatarUrl}` : null);
  }, [currentUser]);

  const handleNameChange = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!name.trim()) {
      setMessage('نام نمی‌تواند خالی باشد.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/user/profile', { name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('نام با موفقیت به روز شد.');
      if (onUpdateUser) onUpdateUser();
    } catch (error) {
      setMessage(`خطا در به روز رسانی نام: ${error.response?.data?.error || 'خطای سرور'}`);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    if (password.length < 6) {
      setMessage('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('رمزهای عبور مطابقت ندارند.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/user/password', { password }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('رمز عبور با موفقیت به روز شد.');
      setPassword('');
      setConfirmPassword('');
      if (onUpdateUser) onUpdateUser();
    } catch (error) {
      setMessage(`خطا در به روز رسانی رمز عبور: ${error.response?.data?.error || 'خطای سرور'}`);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    setMessage('');
    if (!avatarFile) {
      setMessage('لطفا یک تصویر انتخاب کنید.');
      return;
    }
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/user/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('آواتار با موفقیت آپلود شد.');
      if (onUpdateUser) onUpdateUser();
    } catch (error) {
      setMessage(`خطا در آپلود آواتار: ${error.response?.data?.error || 'خطای سرور'}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 sm:p-8 border border-gray-700 text-white space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-white mb-6">تنظیمات حساب کاربری</h3>

        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4 mb-8">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-2 border-purple-500" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-2 border-purple-500">
                <User size={64} className="text-gray-500" />
              </div>
            )}
            <label htmlFor="avatarUpload" className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full cursor-pointer hover:bg-purple-700">
              <Camera size={20} className="text-white" />
              <input type="file" id="avatarUpload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          {avatarFile && (
            <button
              onClick={handleAvatarUpload}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              آپلود آواتار
            </button>
          )}
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleNameChange} className="space-y-4 mb-8">
          <h4 className="text-lg font-medium border-b border-gray-700 pb-2 mb-4">اطلاعات کاربری</h4>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">ایمیل (غیرقابل تغییر)</label>
            <input
              type="email"
              id="email"
              value={email}
              readOnly
              className="mt-1 w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">نام</label>
            <div className="flex">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 flex-grow bg-gray-700/50 border border-gray-600 rounded-r-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button type="submit" className="mt-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-l-lg flex items-center">
                <Edit3 size={18} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">ذخیره</span>
              </button>
            </div>
          </div>
        </form>

        {/* Password Change Form */}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <h4 className="text-lg font-medium border-b border-gray-700 pb-2 mb-4">تغییر رمز عبور</h4>
          <div>
            <label htmlFor="password_current" className="block text-sm font-medium text-gray-300">رمز عبور جدید</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-300">تکرار رمز عبور جدید</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button type="submit" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg">
            تغییر رمز عبور
          </button>
        </form>

        {message && (
          <p className={`mt-6 text-sm ${message.includes('موفقیت') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsView;