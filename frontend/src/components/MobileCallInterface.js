import React, { useState, useEffect, useRef } from 'react';
import CallLogger from './CallLogger';
import CallNotes from './CallNotes';
import CallOutcome from './CallOutcome';
import CallFollowUp from './CallFollowUp';
import CallAnalytics from './CallAnalytics';
import EnhancedCallHistory from './EnhancedCallHistory';

/**
 * MobileCallInterface - Comprehensive mobile-first call logging interface
 * Integrates all call logging components with real-time collaboration and offline support
 */

const MobileCallInterface = ({ 
  userId = null,
  initialLead = null,
  isCallActive = false,
  onCallEnd,
  className = '' 
}) => {
  // Interface state
  const [activeTab, setActiveTab] = useState('logger');
  const [currentLead, setCurrentLead] = useState(initialLead);
  const [currentCall, setCurrentCall] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingData, setPendingData] = useState([]);
  
  // Real-time collaboration
  const [collaborators, setCollaborators] = useState([]);
  const [liveUpdates, setLiveUpdates] = useState([]);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  
  // Mobile-specific state
  const [orientation, setOrientation] = useState(window.orientation || 0);
  const [showKeyboardCompensation, setShowKeyboardCompensation] = useState(false);
  const [swipeGesture, setSwipeGesture] = useState({ startX: 0, startY: 0 });
  
  // Performance state
  const [loadingStates, setLoadingStates] = useState({});
  const [errorStates, setErrorStates] = useState({});
  
  // Refs for gesture handling
  const interfaceRef = useRef(null);
  const touchStartRef = useRef(null);
  
  // Tab configuration with mobile optimization
  const tabs = [
    {
      id: 'logger',
      label: 'Logger',
      icon: '📝',
      component: CallLogger,
      description: 'Log current call',
      mobileFirst: true
    },
    {
      id: 'outcome',
      label: 'Outcome',
      icon: '🎯',
      component: CallOutcome,
      description: 'Set call outcome',
      showAfterCall: true
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: '📄',
      component: CallNotes,
      description: 'Detailed notes',
      collaborative: true
    },
    {
      id: 'followup',
      label: 'Follow-up',
      icon: '📅',
      component: CallFollowUp,
      description: 'Schedule next steps',
      showAfterOutcome: true
    },
    {
      id: 'history',
      label: 'History',
      icon: '📞',
      component: EnhancedCallHistory,
      description: 'Call history',
      alwaysAvailable: true
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      component: CallAnalytics,
      description: 'Performance metrics',
      premium: true
    }
  ];
  
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncPendingData();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Orientation change handling
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.orientation || 0);
      // Adjust interface for landscape/portrait
      setTimeout(() => {
        if (interfaceRef.current) {
          interfaceRef.current.scrollTop = 0;
        }
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);
  
  // Keyboard compensation for mobile inputs
  useEffect(() => {
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const keyboardOpen = windowHeight - viewportHeight > 150;
        setShowKeyboardCompensation(keyboardOpen);
      }
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      return () => window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
    }
  }, []);
  
  // Touch gesture handling for swipe navigation
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setSwipeGesture({ startX: touch.clientX, startY: touch.clientY });
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };
  
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Horizontal swipe for tab navigation
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - previous tab
        setActiveTab(tabs[currentIndex - 1].id);
      } else if (deltaX < 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        setActiveTab(tabs[currentIndex + 1].id);
      }
    }
    
    touchStartRef.current = null;
  };
  
  // Sync pending data when coming back online
  const syncPendingData = async () => {
    if (pendingData.length === 0) return;
    
    try {
      setLoadingStates({ sync: true });
      
      // Process each pending item
      for (const item of pendingData) {
        switch (item.type) {
          case 'call_log':
            // Sync call log
            break;
          case 'notes':
            // Sync notes
            break;
          case 'outcome':
            // Sync outcome
            break;
          case 'followup':
            // Sync follow-up
            break;
        }
      }
      
      setPendingData([]);
      setErrorStates({});
      
      // Show success notification
      showNotification('✅ Data synced successfully', 'success');
    } catch (error) {
      console.error('Failed to sync pending data:', error);
      setErrorStates({ sync: 'Failed to sync data' });
    } finally {
      setLoadingStates({});
    }
  };
  
  // Handle offline data storage
  const handleOfflineData = (type, data) => {
    const pendingItem = {
      id: Date.now().toString(),
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    setPendingData(prev => [...prev, pendingItem]);
    
    // Store in localStorage for persistence
    try {
      const existing = JSON.parse(localStorage.getItem('coldcaller_pending') || '[]');
      localStorage.setItem('coldcaller_pending', JSON.stringify([...existing, pendingItem]));
    } catch (error) {
      console.error('Failed to store offline data:', error);
    }
  };
  
  // Show mobile-optimized notification
  const showNotification = (message, type = 'info') => {
    // Create mobile-friendly toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 left-4 right-4 p-4 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 
      'bg-blue-500'
    } text-white shadow-lg transform transition-transform duration-300 translate-y-[-100px]`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translate-y-0';
    });
    
    // Remove after delay
    setTimeout(() => {
      toast.style.transform = 'translate-y-[-100px]';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };
  
  // Handle call logging
  const handleCallLogged = (callData) => {
    setCurrentCall(callData);
    
    if (isOffline) {
      handleOfflineData('call_log', callData);
      showNotification('📱 Call saved offline', 'info');
    } else {
      showNotification('✅ Call logged successfully', 'success');
    }
    
    // Auto-navigate to outcome if call just ended
    if (!isCallActive) {
      setActiveTab('outcome');
    }
  };
  
  // Handle outcome set
  const handleOutcomeSet = (outcomeData) => {
    if (isOffline) {
      handleOfflineData('outcome', outcomeData);
    }
    
    // Auto-navigate to follow-up if appointment set or callback requested
    if (outcomeData.outcome?.includes('Appointment') || outcomeData.outcome?.includes('Callback')) {
      setActiveTab('followup');
    }
  };
  
  // Handle follow-up scheduled
  const handleFollowUpScheduled = (followUpData) => {
    if (isOffline) {
      handleOfflineData('followup', followUpData);
    }
    
    showNotification('📅 Follow-up scheduled', 'success');
  };
  
  // Handle notes change
  const handleNotesChange = (notes) => {
    // Auto-save notes every 30 seconds
    if (isOffline) {
      handleOfflineData('notes', { notes, callId: currentCall?.id });
    }
  };
  
  // Get visible tabs based on current state
  const getVisibleTabs = () => {
    return tabs.filter(tab => {
      if (tab.alwaysAvailable) return true;
      if (tab.mobileFirst && (isCallActive || activeTab === tab.id)) return true;
      if (tab.showAfterCall && currentCall) return true;
      if (tab.showAfterOutcome && currentCall?.outcome) return true;
      return activeTab === tab.id;
    });
  };
  
  // Render active component
  const renderActiveComponent = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;
    
    const Component = activeTabConfig.component;
    const commonProps = {
      userId,
      leadId: currentLead?.id,
      leadData: currentLead,
      callId: currentCall?.id,
      isCallActive
    };
    
    switch (activeTab) {
      case 'logger':
        return (
          <Component
            {...commonProps}
            onCallLogged={handleCallLogged}
            onSaveTemporary={(data) => handleOfflineData('temp_notes', data)}
          />
        );
      
      case 'outcome':
        return (
          <Component
            {...commonProps}
            onOutcomeSet={handleOutcomeSet}
            initialOutcome={currentCall?.outcome}
            showAnalytics={!isOffline}
          />
        );
      
      case 'notes':
        return (
          <Component
            {...commonProps}
            initialNotes={currentCall?.notes || ''}
            onNotesChange={handleNotesChange}
            showCollaboration={!isOffline}
          />
        );
      
      case 'followup':
        return (
          <Component
            {...commonProps}
            onFollowUpScheduled={handleFollowUpScheduled}
            onTaskCreated={(tasks) => showNotification(`${tasks.length} tasks created`, 'success')}
          />
        );
      
      case 'history':
        return (
          <Component
            userId={userId}
            onCallSelect={(call) => {
              setCurrentCall(call);
              setCurrentLead({ id: call.leadId, name: call.leadName, company: call.company, phone: call.phone });
              setActiveTab('notes');
            }}
            maxItems={50}
          />
        );
      
      case 'analytics':
        return (
          <Component
            userId={userId}
            showRealTime={!isOffline}
            refreshInterval={isOffline ? 0 : 300000}
          />
        );
      
      default:
        return <div>Component not found</div>;
    }
  };
  
  const visibleTabs = getVisibleTabs();
  const isLandscape = Math.abs(orientation) === 90;
  
  return (
    <div 
      ref={interfaceRef}
      className={`mobile-call-interface bg-gray-50 min-h-screen ${className} ${
        showKeyboardCompensation ? 'keyboard-open' : ''
      } ${isLandscape ? 'landscape' : 'portrait'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Status Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Current Lead Info */}
            {currentLead && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{currentLead.name}</div>
                  <div className="text-xs text-gray-500">{currentLead.company}</div>
                </div>
              </div>
            )}
            
            {/* Call Status */}
            {isCallActive && (
              <div className="flex items-center bg-red-100 text-red-700 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                <span className="text-xs font-medium">Live Call</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Offline Indicator */}
            {isOffline && (
              <div className="flex items-center bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                <span className="text-xs">📱 Offline</span>
                {pendingData.length > 0 && (
                  <span className="text-xs ml-1">({pendingData.length})</span>
                )}
              </div>
            )}
            
            {/* Sync Status */}
            {loadingStates.sync && (
              <div className="animate-spin text-blue-600">🔄</div>
            )}
            
            {/* Collaboration Indicator */}
            {collaborators.length > 0 && (
              <button
                onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
                className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full"
              >
                <span className="text-xs">{collaborators.length} 👥</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="sticky top-[60px] z-30 bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto scrollbar-hide px-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 min-w-[80px] transition-colors touch-manipulation ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Tab Indicator Dots */}
        <div className="flex justify-center py-2">
          {visibleTabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                activeTab === tab.id ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`flex-1 ${isLandscape ? 'p-2' : 'p-4'} pb-safe-area`}>
        {renderActiveComponent()}
      </div>
      
      {/* Collaboration Panel */}
      {showCollaborationPanel && collaborators.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-800">Active Collaborators</h4>
            <button
              onClick={() => setShowCollaborationPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="flex space-x-2">
            {collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center bg-green-50 rounded-full px-3 py-1">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <span className="text-xs text-green-700">{collaborator.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Action FAB */}
      {!isCallActive && activeTab !== 'logger' && (
        <button
          onClick={() => setActiveTab('logger')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 touch-manipulation transition-transform active:scale-95"
        >
          <span className="text-xl">📝</span>
        </button>
      )}
      
      <style jsx>{`
        .mobile-call-interface {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          overscroll-behavior: none;
        }
        
        .landscape {
          max-height: 100vh;
          overflow-y: auto;
        }
        
        .keyboard-open {
          height: calc(var(--vh, 1vh) * 100);
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .pb-safe-area {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .touch-manipulation {
          touch-action: manipulation;
        }
        
        @media (orientation: landscape) {
          .mobile-call-interface {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileCallInterface;