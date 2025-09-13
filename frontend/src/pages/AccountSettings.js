/**
 * Account Settings Page
 * Security settings, password management, sessions, and account controls
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/authService';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDarkMode, themeClasses } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [securityInfo, setSecurityInfo] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeSection, setActiveSection] = useState('security');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Security preferences state
  const [securityPrefs, setSecurityPrefs] = useState({
    twoFactorEnabled: false,
    notificationSettings: {
      emailAlerts: true,
      smsAlerts: false,
      loginNotifications: true
    }
  });

  // Account deactivation state
  const [deactivationData, setDeactivationData] = useState({
    reason: '',
    feedback: ''
  });
  const [showDeactivationModal, setShowDeactivationModal] = useState(false);

  // Load security info on mount
  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = async () => {
    setLoading(true);
    try {
      const result = await authService.getSecurityInfo();
      if (result.success) {
        setSecurityInfo(result.data);
        setSecurityPrefs(prev => ({
          ...prev,
          twoFactorEnabled: result.data.twoFactorEnabled || false
        }));
      } else {
        console.error('Failed to load security info:', result.error);
      }
    } catch (error) {
      console.error('Error loading security info:', error);
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        // Force logout to re-authenticate with new password
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'An error occurred while changing your password' });
    }

    setSaving(false);
  };

  const handleSecurityPrefsUpdate = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await authService.updateSecurityPreferences(securityPrefs);

      if (result.success) {
        setMessage({ type: 'success', text: 'Security preferences updated successfully!' });
        loadSecurityInfo(); // Reload to get updated info
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update security preferences' });
      }
    } catch (error) {
      console.error('Error updating security preferences:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating preferences' });
    }

    setSaving(false);
  };

  const handleAccountDeactivation = async () => {
    setSaving(true);

    try {
      const result = await authService.deactivateAccount(
        deactivationData.reason,
        deactivationData.feedback
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Account deactivated successfully. You will be logged out.' });
        
        // Redirect to login after deactivation
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to deactivate account' });
      }
    } catch (error) {
      console.error('Error deactivating account:', error);
      setMessage({ type: 'error', text: 'An error occurred during account deactivation' });
    }

    setSaving(false);
    setShowDeactivationModal(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const sections = [
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'password', name: 'Password', icon: '🗝️' },
    { id: 'sessions', name: 'Sessions', icon: '📱' },
    { id: 'account', name: 'Account', icon: '⚙️' }
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'security':
        return (
          <div className="space-y-6">
            {/* Security Overview */}
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Security Overview</h3>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>Monitor your account security</p>
                </div>
                {securityInfo && (
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getSecurityScoreColor(securityInfo.securityScore)}`}>
                      {securityInfo.securityScore}%
                    </div>
                    <div className={`text-xs ${themeClasses.textSecondary}`}>Security Score</div>
                  </div>
                )}
              </div>

              {securityInfo && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
                      {securityInfo.loginHistory.length}
                    </div>
                    <div className={`text-xs ${themeClasses.textSecondary}`}>Recent Logins</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
                      {securityInfo.activeSessions.length}
                    </div>
                    <div className={`text-xs ${themeClasses.textSecondary}`}>Active Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${
                      securityInfo.twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {securityInfo.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                    <div className={`text-xs ${themeClasses.textSecondary}`}>Two-Factor Auth</div>
                  </div>
                </div>
              )}
            </div>

            {/* Security Settings */}
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
              <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Security Preferences</h3>
              
              <div className="space-y-4">
                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Two-Factor Authentication</p>
                    <p className={`text-xs ${themeClasses.textSecondary}`}>Add an extra layer of security to your account</p>
                  </div>
                  <button
                    onClick={() => setSecurityPrefs(prev => ({
                      ...prev,
                      twoFactorEnabled: !prev.twoFactorEnabled
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securityPrefs.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securityPrefs.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Login Notifications</p>
                    <p className={`text-xs ${themeClasses.textSecondary}`}>Get notified of new login attempts</p>
                  </div>
                  <button
                    onClick={() => setSecurityPrefs(prev => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        loginNotifications: !prev.notificationSettings.loginNotifications
                      }
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securityPrefs.notificationSettings.loginNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securityPrefs.notificationSettings.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Email Alerts */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Email Security Alerts</p>
                    <p className={`text-xs ${themeClasses.textSecondary}`}>Receive security alerts via email</p>
                  </div>
                  <button
                    onClick={() => setSecurityPrefs(prev => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        emailAlerts: !prev.notificationSettings.emailAlerts
                      }
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securityPrefs.notificationSettings.emailAlerts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securityPrefs.notificationSettings.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSecurityPrefsUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'password':
        return (
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
            <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Change Password</h3>
            <p className={`text-sm ${themeClasses.textSecondary} mb-6`}>
              Update your password regularly to keep your account secure
            </p>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handlePasswordChange}
                disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>

            <div className={`mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
              <p className={`text-xs text-yellow-800 dark:text-yellow-200`}>
                <strong>Note:</strong> Changing your password will log you out of all devices. You'll need to log in again with your new password.
              </p>
            </div>
          </div>
        );

      case 'sessions':
        return (
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
            <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Active Sessions</h3>
            <p className={`text-sm ${themeClasses.textSecondary} mb-6`}>
              Manage where you're logged in across devices and browsers
            </p>

            {securityInfo?.activeSessions && (
              <div className="space-y-4">
                {securityInfo.activeSessions.map((session, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${themeClasses.border} ${
                    session.isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          session.isCurrent ? 'bg-blue-600' : 'bg-gray-600'
                        } text-white`}>
                          📱
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>
                            {session.userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser'}
                            {session.isCurrent && <span className="text-blue-600 dark:text-blue-400 ml-2">(Current)</span>}
                          </p>
                          <p className={`text-xs ${themeClasses.textSecondary}`}>
                            {session.location} • {formatDate(session.createdAt)}
                          </p>
                          <p className={`text-xs ${themeClasses.textSecondary}`}>
                            IP: {session.ip}
                          </p>
                        </div>
                      </div>
                      
                      {!session.isCurrent && (
                        <button className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {securityInfo?.loginHistory && (
              <div className="mt-8">
                <h4 className={`text-md font-semibold ${themeClasses.textPrimary} mb-4`}>Recent Login History</h4>
                <div className="space-y-2">
                  {securityInfo.loginHistory.slice(0, 10).map((login, index) => (
                    <div key={index} className="flex items-center space-x-3 py-2">
                      <div className={`w-2 h-2 rounded-full ${
                        login.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm ${themeClasses.textPrimary}`}>
                          {login.status === 'success' ? 'Successful login' : 'Failed login attempt'}
                        </p>
                        <p className={`text-xs ${themeClasses.textSecondary}`}>
                          {formatDate(login.timestamp)} • {login.ip} • {login.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            {/* Account Information */}
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
              <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Account Information</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${themeClasses.textSecondary}`}>Email</span>
                  <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>{user?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${themeClasses.textSecondary}`}>Account Type</span>
                  <span className={`text-sm font-medium ${themeClasses.textPrimary} capitalize`}>
                    {user?.role?.replace('_', ' ').toLowerCase() || 'User'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${themeClasses.textSecondary}`}>Created</span>
                  <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>
                    {user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${themeClasses.textSecondary}`}>Status</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6`}>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Deactivate Account</p>
                    <p className="text-xs text-red-600 dark:text-red-300">
                      Temporarily disable your account. You can reactivate it later.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeactivationModal(true)}
                    className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>Account Settings</h1>
        <p className={`text-sm ${themeClasses.textSecondary}`}>
          Manage your security settings and account preferences
        </p>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-4`}>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : `${themeClasses.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700/50`
                  }`}
                >
                  <span className="text-lg">{section.icon}</span>
                  <span>{section.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-8 text-center`}>
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className={`text-sm ${themeClasses.textSecondary}`}>Loading account settings...</p>
            </div>
          ) : (
            renderSectionContent()
          )}
        </div>
      </div>

      {/* Deactivation Modal */}
      {showDeactivationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${themeClasses.cardBg} rounded-xl shadow-xl border ${themeClasses.border} p-6 w-full max-w-md mx-4`}>
            <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>
              Deactivate Account
            </h3>
            <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
              Are you sure you want to deactivate your account? You can reactivate it later by contacting support.
            </p>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={deactivationData.reason}
                  onChange={(e) => setDeactivationData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Why are you deactivating your account?"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Feedback (optional)
                </label>
                <textarea
                  value={deactivationData.feedback}
                  onChange={(e) => setDeactivationData(prev => ({ ...prev, feedback: e.target.value }))}
                  placeholder="Any additional feedback..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDeactivationModal(false)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAccountDeactivation}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Deactivating...' : 'Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;