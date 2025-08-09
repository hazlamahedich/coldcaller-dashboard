import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useCall } from '../contexts/CallContext';
import ThemeToggle from './ThemeToggle';
import FloatingCallBar from './FloatingCallBar';

function Layout({ children }) {
  const { isDarkMode, themeClasses } = useTheme();
  const { 
    isCallActive, 
    callState, 
    currentCall, 
    callDuration,
    isMuted,
    isOnHold,
    toggleMute,
    toggleHold,
    endCall
  } = useCall();
  const location = useLocation();

  const navigationItems = [
    {
      path: '/',
      name: 'Make Calls',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    },
    {
      path: '/leads',
      name: 'Manage Leads',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      path: '/analytics',
      name: 'Analytics',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      path: '/settings',
      name: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeClasses.bg}`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Link to="/" className={`text-xl font-semibold ${themeClasses.textPrimary} hover:opacity-80 transition-opacity`}>
                  Cold Caller Pro
                </Link>
              </div>
              <div className={`hidden sm:block text-sm ${themeClasses.textSecondary}`}>
                Professional calling dashboard
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : `${themeClasses.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100`
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button className={`p-2 rounded-lg transition-colors ${themeClasses.hover} ${themeClasses.textPrimary}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden pb-4">
            <nav className="flex flex-col space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActivePath(item.path)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : `${themeClasses.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100`
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Floating Call Bar */}
      <FloatingCallBar
        isVisible={isCallActive}
        callState={callState}
        leadData={currentCall?.leadData}
        phoneNumber={currentCall?.phoneNumber}
        callDuration={callDuration}
        isMuted={isMuted}
        isOnHold={isOnHold}
        onMute={toggleMute}
        onHold={toggleHold}
        onHangup={endCall}
        onTransfer={() => console.log('Transfer feature coming soon')}
        onShowDialpad={() => console.log('Dialpad feature coming soon')}
      />

      {/* Footer */}
      <footer className={`border-t ${themeClasses.border} mt-12 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6 transition-colors duration-200`}>
            <div className="text-center">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-700'} mb-3`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Professional Cold Calling Dashboard</span>
              </div>
              <p className={`text-sm ${themeClasses.textSecondary} max-w-2xl mx-auto`}>
                Navigate between different sections using the top navigation menu - Make calls, manage your leads, view analytics, and adjust settings.
              </p>
              <div className={`text-xs ${themeClasses.textSecondary} mt-4 opacity-75`}>
                Enhanced with real-time analytics and comprehensive lead management
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;