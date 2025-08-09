import React, { useState, useEffect } from 'react';

// Import components for the make calls page (current dashboard components)
import DialPad from '../components/DialPad';
import AudioClipPlayer from '../components/AudioClipPlayer';
import ScriptDisplay from '../components/ScriptDisplay';
import LeadPanel from '../components/LeadPanel';
import CallStatus from '../components/CallStatus';

// Import contexts
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

// Import API services
import { callsService, api } from '../services';

function MakeCalls() {
  const { isDarkMode, themeClasses } = useTheme();
  const { useMockData } = useSettings();
  
  // Dashboard Statistics State
  const [stats, setStats] = useState({
    callsMade: 0,
    contactsReached: 0,
    appointmentsSet: 0
  });
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiHealthy, setApiHealthy] = useState(false);
  const [error, setError] = useState(null);

  // Load dashboard data on component mount or when mock data setting changes
  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, [useMockData]);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // If mock data is disabled, show empty state for production
      if (!useMockData) {
        console.log('🚫 Mock data disabled - showing clean production state');
        setStats({
          callsMade: 0,
          contactsReached: 0,
          appointmentsSet: 0
        });
        setRecentCalls([]);
        setApiHealthy(false);
        setLoading(false);
        return;
      }
      
      // Check API health first
      const healthResponse = await api.healthCheck();
      const isHealthy = healthResponse.status === 'ok';
      setApiHealthy(isHealthy);
      
      if (isHealthy) {
        // Load today's statistics
        const [statsResponse, callsResponse] = await Promise.all([
          callsService.getTodayStats(),
          callsService.getRecentCalls(5)
        ]);
        
        if (statsResponse.success) {
          setStats({
            callsMade: statsResponse.data.callsMade || statsResponse.data.totalCalls || 0,
            contactsReached: statsResponse.data.contactsReached || statsResponse.data.connected || 0,
            appointmentsSet: statsResponse.data.appointmentsSet || statsResponse.data.appointments || 0
          });
        }
        
        if (callsResponse.success) {
          setRecentCalls(callsResponse.data.slice(0, 3)); // Show only 3 recent calls
        }
        
        console.log('✅ Dashboard data loaded successfully');
      } else {
        // Use fallback demo data when API is unavailable (only if mock data enabled)
        setStats({
          callsMade: 12,
          contactsReached: 5,
          appointmentsSet: 2
        });
        setRecentCalls([
          { id: 1, leadName: 'John Smith', time: '10:30 AM', outcome: 'Connected' },
          { id: 2, leadName: 'Sarah Johnson', time: '11:15 AM', outcome: 'Voicemail' },
          { id: 3, leadName: 'Mike Chen', time: '2:45 PM', outcome: 'Callback' }
        ]);
        console.log('⚠️ Using demo data - API unavailable');
      }
    } catch (err) {
      console.error('❌ Failed to load dashboard data:', err);
      setError('Failed to load dashboard statistics');
      setApiHealthy(false);
      
      // Use fallback demo data (only if mock data enabled)
      if (useMockData) {
        setStats({
          callsMade: 12,
          contactsReached: 5,
          appointmentsSet: 2
        });
      } else {
        setStats({
          callsMade: 0,
          contactsReached: 0,
          appointmentsSet: 0
        });
        setRecentCalls([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = () => {
    setLoading(true);
    loadDashboardData();
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>Make Calls</h1>
            <p className={`text-sm ${themeClasses.textSecondary}`}>Your calling workspace - dial, script, and track your conversations</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* API Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                apiHealthy ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className={`text-sm ${themeClasses.textSecondary}`}>
{apiHealthy ? 'Live Mode' : 'Demo Mode'}
              </span>
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={refreshDashboard}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              } disabled:opacity-50`}
              title="Refresh dashboard"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Grid: Left(4) | Center(4) | Right(4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-full">
        
        {/* Left Column (4 cols) - Lead Information Only */}
        <div className="lg:col-span-4 space-y-6 h-full flex flex-col">
          {/* Lead Information Card - First item in first column */}
          <div className={`${isDarkMode ? 'bg-black border-gray-700' : themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200`}>
            <div className="p-4">
              <h2 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Lead Information</h2>
              <LeadPanel />
            </div>
          </div>
          
          {/* Call Status Card */}
          <div className={`${isDarkMode ? 'bg-black border-gray-700' : themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200 flex-grow`}>
            <div className="p-4">
              <CallStatus 
                callState="idle" 
                sipStatus="registered"
                connectionQuality="excellent"
                audioQuality="good"
                networkLatency={45}
              />
            </div>
          </div>
        </div>

        {/* Center Column (4 cols) - DialPad, Call History & Performance */}
        <div className="lg:col-span-4 space-y-6 h-full flex flex-col">
          {/* Dial Pad Card - Top of center column */}
          <div className={`${isDarkMode ? 'bg-black border-gray-700' : themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200`}>
            <div className="p-6">
              <h2 className={`text-lg font-semibold mb-4 text-center ${themeClasses.textPrimary}`}>Phone Dialer</h2>
              <div className="flex justify-center items-center">
                <DialPad />
              </div>
            </div>
          </div>

          {/* Call History Card - Second position in center column */}
          <div className={`${isDarkMode ? 'bg-black border-gray-700' : themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200`}>
            <div className="p-4">
              <h2 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Call History</h2>
              
              {loading ? (
                <div className={`text-center py-6 ${themeClasses.textSecondary}`}>
                  <div className="animate-spin inline-block w-5 h-5 border-[2px] border-current border-t-transparent rounded-full mb-2"></div>
                  <div className="text-sm">Loading recent calls...</div>
                </div>
              ) : recentCalls.length > 0 ? (
                <div className="space-y-2">
                  {recentCalls.map((call) => (
                    <div key={call.id} className={`p-2 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-900' : themeClasses.border} hover:shadow-sm transition-shadow`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`font-medium text-sm ${themeClasses.textPrimary}`}>{call.leadName}</div>
                          {call.outcome && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              call.outcome === 'Connected' ? 
                                (isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800') :
                              call.outcome === 'Voicemail' ? 
                                (isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800') :
                              call.outcome === 'Callback' ? 
                                (isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                                (isDarkMode ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-100 text-gray-800')
                            }`}>
                              {call.outcome}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs ${themeClasses.textSecondary}`}>{call.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-6 ${themeClasses.textSecondary}`}>
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div className="text-sm">No recent calls</div>
                  <div className="text-xs mt-1 opacity-75">Your call history will appear here</div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Performance Card - Third position in center column */}
          <div className={`${isDarkMode ? 'bg-black border-gray-700' : themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200 flex-grow`}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Today's Performance</h2>
                {error && (
                  <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                    {error}
                  </div>
                )}
              </div>
              
              {/* Performance Metrics with Enhanced Gradients */}
              <div className="space-y-3">
                <div className={`p-3 rounded-lg border ${themeClasses.border} bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 ${isDarkMode ? 'from-blue-900/30 via-blue-800/20 to-blue-700/10' : ''} hover:shadow-md transition-all duration-200`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`text-xs font-medium ${themeClasses.textSecondary} block`}>Calls Made</span>
                      <span className={`text-xl font-bold ${
                        loading ? 'text-gray-400' : isDarkMode ? 'text-blue-300' : 'text-blue-700'
                      }`}>
                        {loading ? '...' : stats.callsMade}
                      </span>
                    </div>
                    <svg className={`w-8 h-8 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} opacity-60`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg border ${themeClasses.border} bg-gradient-to-br from-green-50 via-green-100 to-green-200 ${isDarkMode ? 'from-green-900/30 via-green-800/20 to-green-700/10' : ''} hover:shadow-md transition-all duration-200`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`text-xs font-medium ${themeClasses.textSecondary} block`}>Contacts Reached</span>
                      <span className={`text-xl font-bold ${
                        loading ? 'text-gray-400' : isDarkMode ? 'text-green-300' : 'text-green-700'
                      }`}>
                        {loading ? '...' : stats.contactsReached}
                      </span>
                    </div>
                    <svg className={`w-8 h-8 ${isDarkMode ? 'text-green-300' : 'text-green-600'} opacity-60`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg border ${themeClasses.border} bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 ${isDarkMode ? 'from-purple-900/30 via-purple-800/20 to-purple-700/10' : ''} hover:shadow-md transition-all duration-200`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`text-xs font-medium ${themeClasses.textSecondary} block`}>Appointments Set</span>
                      <span className={`text-xl font-bold ${
                        loading ? 'text-gray-400' : isDarkMode ? 'text-purple-300' : 'text-purple-700'
                      }`}>
                        {loading ? '...' : stats.appointmentsSet}
                      </span>
                    </div>
                    <svg className={`w-8 h-8 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'} opacity-60`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) - Audio Library & Call Scripts */}
        <div className="lg:col-span-4 space-y-6 h-full flex flex-col">
          {/* Audio Library Card - First item in right column */}
          <div className={`${isDarkMode ? 'bg-black border-gray-700' : themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200`}>
            <div className="p-6">
              <h2 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Audio Library</h2>
              <AudioClipPlayer />
            </div>
          </div>

          {/* Call Script Card - Second item in right column */}
          <div className={`${isDarkMode ? 'bg-black border-gray-700' : themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200 flex-grow`}>
            <div className="p-4">
              <h2 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Call Scripts</h2>
              <ScriptDisplay />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MakeCalls;