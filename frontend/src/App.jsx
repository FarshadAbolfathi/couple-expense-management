import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react'; // Import X icon
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import CreateSpouseForm from './components/CreateSpouseForm';
import Dashboard from './components/Dashboard';

const App = () => {
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingLoginCredentials, setPendingLoginCredentials] = useState(null);
  const [toastNotification, setToastNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (toastNotification.show) {
      const timer = setTimeout(() => {
        setToastNotification({ ...toastNotification, show: false });
      }, 5000); // Auto-dismiss after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/user', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        // Token is valid, user data received
        handleLoginSuccess(res.data.user, token);
      })
      .catch(() => {
        // Token is invalid or expired
        handleLogout();
      });
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // On login success
  const handleLoginSuccess = (user, token) => { // Assuming token is also handled here or globally
    localStorage.setItem('token', token); // Ensure token is stored on login
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setCurrentView('dashboard');
    setPendingLoginCredentials(null); // Clear any pending credentials
  };

  // On logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setCurrentView('login');
  };

  // On register success - now triggers auto-login flow
  const handleRegisterSuccess = (registrationData, email, password) => {
    // registrationData contains user and token from backend's /register
    // We don't immediately set currentUser here. Instead, we set credentials for auto-login.
    console.log('Registration successful, preparing for auto-login:', registrationData);
    // The backend /register endpoint already returns a token and user object.
    // We can store this token immediately.
    if (registrationData.token) {
      localStorage.setItem('token', registrationData.token);
    }
    // Pass email and password to LoginForm for auto-fill and submission
    setPendingLoginCredentials({ email, password, rememberMe: true });
    setCurrentView('login'); // Switch to login view
  };

  // On spouse created
  const handleSpouseCreated = (updatedUser) => {
    setCurrentUser(updatedUser);
    setCurrentView('dashboard');
  };

  return (
    <>
      {/* Toast Notification */}
      {toastNotification.show && (
        <div
          className={`fixed top-5 right-1/2 translate-x-1/2 p-4 rounded-md shadow-lg z-[100] transition-all duration-300 ease-in-out
                      ${toastNotification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-700 dark:text-white' : ''}
                      ${toastNotification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-700 dark:text-white' : ''}
                      max-w-md w-11/12 md:w-auto`}
          dir="rtl"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm">{toastNotification.message}</p>
            <button
              onClick={() => setToastNotification({ ...toastNotification, show: false })}
              className={`mr-4 p-1 rounded-md
                          ${toastNotification.type === 'success' ? 'hover:bg-green-200 dark:hover:bg-green-600' : ''}
                          ${toastNotification.type === 'error' ? 'hover:bg-red-200 dark:hover:bg-red-600' : ''}`}
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {currentView === 'login' && (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setCurrentView('register')}
          pendingCredentials={pendingLoginCredentials}
          clearPendingCredentials={() => setPendingLoginCredentials(null)}
          setToastNotification={setToastNotification}
        />
      )}
      {currentView === 'register' && (
        <RegisterForm
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setCurrentView('login')}
          setToastNotification={setToastNotification}
        />
      )}
      {currentView === 'create-spouse' && currentUser && (
        <CreateSpouseForm currentUser={currentUser} onSpouseCreated={handleSpouseCreated} onSkip={() => setCurrentView('dashboard')} setToastNotification={setToastNotification} />
      )}
      {currentView === 'dashboard' && currentUser && (
        <Dashboard currentUser={currentUser} onLogout={handleLogout} setToastNotification={setToastNotification} />
      )}
    </>
  );
};

export default App;
