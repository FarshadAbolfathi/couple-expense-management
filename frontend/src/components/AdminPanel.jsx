import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, AlertCircle, Eye, EyeOff, Edit3, Trash2 } from 'lucide-react';

const AdminPanel = ({ currentUser, isDarkMode }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwords, setPasswords] = useState({});
  const [editingPassword, setEditingPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/admin/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUsers(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('خطا در دریافت لیست کاربران. لطفاً دوباره تلاش کنید.');
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const fetchPassword = async (userId) => {
    try {
      const response = await axios.get(`/api/admin/user-password/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPasswords(prev => ({ ...prev, [userId]: response.data.password }));
    } catch (error) {
      console.error('Error fetching user password:', error);
    }
  };

  const updatePassword = async (userId) => {
    try {
      await axios.put(`/api/admin/user-password/${userId}`, {
        newPassword
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEditingPassword(null);
      setNewPassword('');
      alert('رمز عبور با موفقیت به روز شد.');
    } catch (error) {
      console.error('Error updating user password:', error);
      alert('خطا در به روز رسانی رمز عبور.');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('آیا از حذف این کاربر مطمئن هستید؟')) {
      try {
        await axios.delete(`/api/admin/user/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUsers(users.filter(user => user.id !== userId));
        alert('کاربر با موفقیت حذف شد.');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('خطا در حذف کاربر.');
      }
    }
  };

  const findSpouseName = (spouseId) => {
    if (!spouseId) return 'ندارد';
    const spouse = users.find(user => user.id === spouseId);
    return spouse ? spouse.name : `کاربر ${spouseId}`;
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border`}>
      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>مدیریت کاربران</h3>

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : error ? (
        <div className="flex items-center p-4 bg-red-100 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-right p-3 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>نام</th>
                <th className={`text-right p-3 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>ایمیل</th>
                <th className={`text-right p-3 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>همسر</th>
                <th className={`text-right p-3 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>رمز عبور</th>
                <th className={`text-right p-3 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>وضعیت</th>
                <th className={`text-right p-3 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id} className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</td>
                    <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.email}</td>
                    <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{findSpouseName(user.spouseId)}</td>
                    <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {editingPassword === user.id ? (
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white"
                          />
                          <button onClick={() => updatePassword(user.id)} className="ml-2 text-green-500">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingPassword(null)} className="ml-2 text-red-500">
                            <EyeOff className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span>{passwords[user.id] || '********'}</span>
                          <button onClick={() => fetchPassword(user.id)} className="ml-2 text-blue-500">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingPassword(user.id)} className="ml-2 text-yellow-500">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center">
                        {user.spouseId ? (
                          <span className="flex items-center text-green-500">
                            <UserCheck className="w-4 h-4 mr-1" />
                            متاهل
                          </span>
                        ) : (
                          <span className="flex items-center text-blue-500">
                            <Users className="w-4 h-4 mr-1" />
                            مجرد
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <button onClick={() => deleteUser(user.id)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={`p-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    هیچ کاربری یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;