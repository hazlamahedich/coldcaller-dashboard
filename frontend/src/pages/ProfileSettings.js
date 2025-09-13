/**
 * Profile Settings Page
 * Personal information, avatar upload, preferences, and recent activity
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/authService';

const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  const { isDarkMode, themeClasses } = useTheme();
  const [saving, setSaving] = useState(false);
  const [securityInfo, setSecurityInfo] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
    bio: user?.bio || '',
    timezone: user?.timezone || 'America/New_York',
    avatarUrl: user?.avatarUrl || ''
  });

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Load security info on mount
  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = async () => {
    try {
      const result = await authService.getSecurityInfo();
      if (result.success) {
        setSecurityInfo(result.data);
      } else {
        console.error('Failed to load security info:', result.error);
      }
    } catch (error) {
      console.error('Error loading security info:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const result = await authService.updateProfile(profileData);
      
      if (result.success) {
        // Update user context
        updateUser(result.data.user);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        
        // Clear avatar preview if it was updated
        if (avatarFile) {
          setAvatarFile(null);
          setAvatarPreview(null);
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating your profile' });
    }
    
    setSaving(false);
  };

  const InputField = ({ label, type = 'text', field, placeholder, maxLength, rows }) => (
    <div>
      <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
        {label}
      </label>
      {rows ? (
        <textarea
          value={profileData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      ) : (
        <input
          type={type}
          value={profileData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={field === 'email'} // Email is read-only
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          } ${field === 'email' ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
      )}
      {maxLength && (
        <div className={`text-xs ${themeClasses.textSecondary} mt-1 text-right`}>
          {profileData[field].length}/{maxLength}
        </div>
      )}
    </div>
  );

  const SelectField = ({ label, field, options }) => (
    <div>
      <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
        {label}
      </label>
      <select
        value={profileData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          isDarkMode 
            ? 'bg-gray-700 border-gray-600 text-white' 
            : 'bg-white border-gray-300 text-gray-900'
        }`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>Profile Settings</h1>
        <p className={`text-sm ${themeClasses.textSecondary}`}>
          Manage your personal information and preferences
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Personal Information</h2>
                <p className={`text-sm ${themeClasses.textSecondary}`}>Update your personal details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="First Name"
                field="firstName"
                placeholder="Enter your first name"
                maxLength={50}
              />
              <InputField
                label="Last Name"
                field="lastName"
                placeholder="Enter your last name"
                maxLength={50}
              />
              <InputField
                label="Email Address"
                type="email"
                field="email"
                placeholder="Your email address"
              />
              <InputField
                label="Phone Number"
                type="tel"
                field="phone"
                placeholder="+1 (555) 123-4567"
                maxLength={20}
              />
              <InputField
                label="Company"
                field="company"
                placeholder="Your company name"
                maxLength={100}
              />
              <SelectField
                label="Timezone"
                field="timezone"
                options={[
                  { value: 'America/New_York', label: 'Eastern Time (ET)' },
                  { value: 'America/Chicago', label: 'Central Time (CT)' },
                  { value: 'America/Denver', label: 'Mountain Time (MT)' },
                  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                  { value: 'UTC', label: 'UTC' }
                ]}
              />
            </div>

            <div className="mt-4">
              <InputField
                label="Bio"
                field="bio"
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={4}
              />
            </div>
          </div>

          {/* Avatar Upload Card */}
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Profile Picture</h2>
                <p className={`text-sm ${themeClasses.textSecondary}`}>Update your avatar image</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Current/Preview Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {avatarPreview || profileData.avatarUrl ? (
                    <img
                      src={avatarPreview || profileData.avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-2xl font-bold">
                      {profileData.firstName?.[0]?.toUpperCase() || profileData.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose Image
                </label>
                <p className={`text-xs ${themeClasses.textSecondary} mt-2`}>
                  PNG, JPEG or WebP. Max 5MB. Recommended: 256x256px
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
            <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Account Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${themeClasses.textSecondary}`}>Account Type</span>
                <span className={`text-sm font-medium ${themeClasses.textPrimary} capitalize`}>
                  {user?.role?.replace('_', ' ').toLowerCase() || 'User'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${themeClasses.textSecondary}`}>Member Since</span>
                <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${themeClasses.textSecondary}`}>Last Active</span>
                <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'First time'}
                </span>
              </div>
              {securityInfo && (
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${themeClasses.textSecondary}`}>Security Score</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      securityInfo.securityScore >= 80 ? 'text-green-600 dark:text-green-400' :
                      securityInfo.securityScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {securityInfo.securityScore}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          {securityInfo && securityInfo.loginHistory && (
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
              <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Recent Activity</h3>
              <div className="space-y-3">
                {securityInfo.loginHistory.slice(0, 5).map((login, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      login.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm ${themeClasses.textPrimary}`}>
                        Login {login.status === 'success' ? 'successful' : 'failed'}
                      </p>
                      <p className={`text-xs ${themeClasses.textSecondary}`}>
                        {formatDate(login.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => setProfileData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
            company: user?.company || '',
            bio: user?.bio || '',
            timezone: user?.timezone || 'America/New_York',
            avatarUrl: user?.avatarUrl || ''
          })}
          className={`px-6 py-2 text-sm font-medium rounded-lg border transition-colors ${
            isDarkMode
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Reset
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;