import React, { useState, useEffect } from 'react';

// Import all our components
import DialPad from './components/DialPad';
import AudioClipPlayer from './components/AudioClipPlayer';
import ScriptDisplay from './components/ScriptDisplay';
import LeadPanel from './components/LeadPanel';
import ErrorBoundary from './components/ErrorBoundary';

// Import API services
import { callsService, api } from './services';

// Main App Component - This is the heart of our application
// It combines all our components into one dashboard
// Now integrated with backend API services for real-time data

function App() {
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

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
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
        // Use fallback demo data when API is unavailable
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
      
      // Use fallback demo data
      setStats({
        callsMade: 12,
        contactsReached: 5,
        appointmentsSet: 2
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = () => {
    setLoading(true);
    loadDashboardData();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white py-5 px-5 text-center shadow-lg">
        <h1 className="text-3xl font-bold m-0">🎯 Cold Calling Dashboard</h1>
        <p className="mt-2 text-base opacity-90 m-0">Your all-in-one sales calling platform</p>
      </header>

      {/* Main dashboard layout */}
      <div className="flex flex-wrap gap-5 p-5 min-h-[calc(100vh-200px)] bg-gray-100">
        {/* Left column - Lead info and Scripts */}
        <div className="flex-1 min-w-[350px] basis-[400px]">
          <LeadPanel />
          <ScriptDisplay />
        </div>

        {/* Middle column - Dial pad */}
        <div className="flex-none min-w-[280px] basis-[300px]">
          <DialPad />
          {/* Call statistics - now with real-time data */}
          <div className="card mt-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-slate-700 m-0">Today's Stats</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  apiHealthy ? 'bg-green-500' : 'bg-orange-500'
                }`}></div>
                <span className="text-xs text-gray-500">
                  {apiHealthy ? 'Live' : 'Demo'}
                </span>
                <button 
                  onClick={refreshDashboard}
                  disabled={loading}
                  className="p-1 hover:bg-gray-100 rounded text-xs transition-colors disabled:opacity-50"
                  title="Refresh statistics"
                >
                  {loading ? '🔄' : '🔄'}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded">
                ⚠️ {error}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                <span>Calls Made:</span>
                <span className={`font-bold ${
                  loading ? 'text-gray-400' : 'text-green-600'
                }`}>
                  {loading ? '...' : stats.callsMade}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                <span>Contacts Reached:</span>
                <span className={`font-bold ${
                  loading ? 'text-gray-400' : 'text-green-600'
                }`}>
                  {loading ? '...' : stats.contactsReached}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                <span>Appointments Set:</span>
                <span className={`font-bold ${
                  loading ? 'text-gray-400' : 'text-green-600'
                }`}>
                  {loading ? '...' : stats.appointmentsSet}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Audio clips */}
        <div className="flex-1 min-w-[350px] basis-[400px]">
          <AudioClipPlayer />
          {/* Call log preview - now with real-time data */}
          <div className="card mt-5">
            <h3 className="text-lg font-medium text-slate-700 text-center m-0 mb-4">Recent Calls</h3>
            {loading ? (
              <div className="text-center text-gray-500 py-4">
                🔄 Loading recent calls...
              </div>
            ) : recentCalls.length > 0 ? (
              <div className="space-y-2">
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                    <div>
                      <span className="font-medium">{call.leadName}</span>
                      {call.outcome && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          call.outcome === 'Connected' ? 'bg-green-100 text-green-700' :
                          call.outcome === 'Voicemail' ? 'bg-blue-100 text-blue-700' :
                          call.outcome === 'Callback' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {call.outcome}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 text-xs">{call.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                📞 No recent calls
                <div className="text-xs mt-1">
                  Make your first call to see history here
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with helpful tips */}
      <footer className="bg-slate-600 text-white py-5 px-5 text-center">
        <div className="bg-white bg-opacity-10 p-4 rounded-lg mb-2 text-sm leading-relaxed">
          💡 <strong>Quick Start:</strong> Select a lead → Review the script → Dial the number → Use audio clips when needed
        </div>
        <div className="text-xs opacity-80 mt-2">
          Week 3: Full-Stack Integration - Real-time data with API connectivity!
          <div className="mt-1">
            API Status: <span className={`font-semibold ${
              apiHealthy ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {apiHealthy ? '🟢 Connected' : '🟡 Demo Mode'}
            </span>
          </div>
        </div>
      </footer>
      </div>
    </ErrorBoundary>
  );
}

// All styles now converted to Tailwind CSS classes!

export default App;
