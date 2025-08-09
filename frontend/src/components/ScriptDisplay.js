import React, { useState, useEffect } from 'react';
import { scriptsService } from '../services';
import { dummyScripts } from '../data/dummyData';
import { useTheme } from '../contexts/ThemeContext';
import { useLead } from '../contexts/LeadContext';

// ScriptDisplay Component - Shows color-coded call scripts
// Helps you know what to say during different parts of the call
// Now integrated with backend API services

const ScriptDisplay = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const { getCurrentLead } = useLead();
  
  // API Integration State
  const [scripts, setScripts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Script Display State
  const [selectedScript, setSelectedScript] = useState('introduction');
  const [isExpanded, setIsExpanded] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Personalization State
  const [personalizedScripts, setPersonalizedScripts] = useState({});
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [showPersonalized, setShowPersonalized] = useState(false);

  // Load scripts from API on component mount
  useEffect(() => {
    loadScripts();
  }, []);
  
  // Reset personalized view when script changes
  useEffect(() => {
    setShowPersonalized(false);
  }, [selectedScript]);

  const loadScripts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await scriptsService.getAllScripts();
      
      if (response.success && Object.keys(response.data).length > 0) {
        setScripts(response.data);
        setApiConnected(true);
        console.log('✅ Scripts loaded from API:', Object.keys(response.data).length, 'scripts');
      } else {
        // Fallback to default scripts if API fails or returns no data
        console.log('⚠️ API unavailable, loading default scripts');
        const defaultResponse = await scriptsService.getDefaultScripts();
        setScripts(defaultResponse.data || dummyScripts);
        setApiConnected(false);
      }
    } catch (err) {
      console.error('❌ Failed to load scripts:', err);
      setError('Failed to load scripts from server');
      // Fallback to dummy scripts
      setScripts(dummyScripts);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Get the current script data (personalized version if available and enabled)
  const baseScript = scripts[selectedScript] || Object.values(scripts)[0] || dummyScripts.introduction;
  const personalizedScript = personalizedScripts[selectedScript];
  const currentScript = (showPersonalized && personalizedScript) ? personalizedScript : baseScript;

  // Get Tailwind classes for each script color theme (now theme-aware)
  const getScriptClasses = (color, isSelected = false) => {
    const themes = {
      blue: {
        button: isSelected 
          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
          : isDarkMode 
            ? 'bg-gray-800 hover:bg-blue-900/30 text-gray-300 hover:text-blue-300 border border-gray-600'
            : 'bg-gray-200 hover:bg-blue-100 text-gray-700 hover:text-blue-700',
        border: 'border-blue-500',
        header: 'bg-blue-500'
      },
      yellow: {
        button: isSelected 
          ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
          : isDarkMode
            ? 'bg-gray-800 hover:bg-yellow-900/30 text-gray-300 hover:text-yellow-300 border border-gray-600'
            : 'bg-gray-200 hover:bg-yellow-100 text-gray-700 hover:text-yellow-700',
        border: 'border-yellow-500',
        header: 'bg-yellow-500'
      },
      red: {
        button: isSelected 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : isDarkMode
            ? 'bg-gray-800 hover:bg-red-900/30 text-gray-300 hover:text-red-300 border border-gray-600'
            : 'bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-700',
        border: 'border-red-500',
        header: 'bg-red-500'
      },
      green: {
        button: isSelected 
          ? 'bg-green-500 hover:bg-green-600 text-white' 
          : isDarkMode
            ? 'bg-gray-800 hover:bg-green-900/30 text-gray-300 hover:text-green-300 border border-gray-600'
            : 'bg-gray-200 hover:bg-green-100 text-gray-700 hover:text-green-700',
        border: 'border-green-500',
        header: 'bg-green-500'
      }
    };
    return themes[color] || themes.blue;
  };

  // Function to copy script to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentScript.text);
      // Show a better success message
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = 'Script copied to clipboard!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      
      console.log('✅ Script copied to clipboard');
    } catch (err) {
      console.error('❌ Failed to copy to clipboard:', err);
      // Fallback for older browsers
      alert('Script copied to clipboard!');
    }
  };

  // Function to personalize script with lead data
  const personalizeScript = async () => {
    if (!apiConnected) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = 'Personalization requires API connection';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      return;
    }
    
    const currentLead = getCurrentLead();
    if (!currentLead) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = 'No lead selected for personalization';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      return;
    }
    
    try {
      setIsPersonalizing(true);
      
      const leadData = {
        name: currentLead.name,
        company: currentLead.company,
        phone: currentLead.phone,
        email: currentLead.email
      };
      
      const agentData = {
        name: 'Your Name', // This could be from user settings in the future
        company: 'Your Company' // This could be from user settings in the future
      };
      
      const response = await scriptsService.personalizeScript(selectedScript, leadData, agentData);
      
      if (response.success) {
        setPersonalizedScripts(prev => ({
          ...prev,
          [selectedScript]: response.data
        }));
        setShowPersonalized(true);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        notification.textContent = `Script personalized for ${currentLead.name}!`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
        
        console.log('✅ Script personalized successfully:', response.data);
      } else {
        throw new Error(response.message || 'Failed to personalize script');
      }
    } catch (error) {
      console.error('❌ Failed to personalize script:', error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = 'Failed to personalize script';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    } finally {
      setIsPersonalizing(false);
    }
  };

  // Function to refresh scripts
  const refreshScripts = () => {
    loadScripts();
  };

  const currentTheme = getScriptClasses(currentScript.color);

  return (
    <div className={`rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border w-full transition-all duration-300 overflow-hidden ${
      isCollapsed ? 'pb-0' : 'pb-6'
    }`}>
      {/* Collapsible Header */}
      <div className={`px-6 pt-6 ${isCollapsed ? 'pb-6' : 'pb-0'}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <h2 className={`text-xl font-bold ${themeClasses.textPrimary}`}>Call Scripts</h2>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={isCollapsed ? 'Expand Call Scripts' : 'Collapse Call Scripts'}
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-90' : '-rotate-90'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {!isCollapsed && (
            <button
              onClick={() => setCompactView(!compactView)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title="Toggle compact view"
            >
              {compactView ? '📋 Full View' : '📝 Compact'}
            </button>
          )}
        </div>
        
        {isCollapsed && (
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
            Click to expand call scripts
          </p>
        )}
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'max-h-0 opacity-0 overflow-hidden' 
          : 'max-h-[2000px] opacity-100'
      }`}>
        <div className="px-6 pb-2">
        {loading && (
          <div className={`text-sm mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            🔄 Loading scripts...
          </div>
        )}
        {error && (
          <div className={`text-sm mt-1 p-2 rounded ${
            isDarkMode 
              ? 'text-red-400 bg-red-900/20 border border-red-800' 
              : 'text-red-600 bg-red-50 border border-red-200'
          }`}>
            ⚠️ {error}
            <button 
              onClick={refreshScripts} 
              className={`ml-2 hover:underline ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              Retry
            </button>
          </div>
        )}
        {!loading && (
          <div className={`text-xs mt-1 ${themeClasses.textSecondary}`}>
            API: <span className={`font-semibold ${
              apiConnected ? 'text-green-500' : 'text-orange-500'
            }`}>
              {apiConnected ? '🟢 Connected' : '🟡 Offline'}
            </span>
          </div>
        )}
      </div>
      
      {/* Script selection buttons - Responsive layout with compact/full toggle */}
      <div className={`mb-6 ${compactView ? 'max-h-32' : 'max-h-80'} overflow-y-auto`}>
        {compactView ? (
          // Compact view - horizontal scrolling chips
          <div className="flex gap-2 pb-2 overflow-x-auto">
            {Object.keys(scripts).length > 0 ? Object.keys(scripts).map((scriptKey) => {
              const script = scripts[scriptKey];
              const isSelected = selectedScript === scriptKey;
              const buttonClasses = getScriptClasses(script.color, isSelected);
              
              return (
                <button
                  key={scriptKey}
                  onClick={() => setSelectedScript(scriptKey)}
                  disabled={loading}
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-full font-medium text-xs whitespace-nowrap
                    transition-all duration-200 transform hover:scale-105
                    border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-1
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${buttonClasses.button}
                    ${isSelected ? 'shadow-md ring-1 ring-blue-300' : 'shadow-sm hover:shadow-md'}
                  `}
                >
                  {script.title}
                  {isSelected && <span className="ml-1">✓</span>}
                </button>
              );
            }) : (
              <div className={`text-center py-4 ${themeClasses.textSecondary}`}>
                {loading ? '🔄 Loading...' : '📝 No scripts'}
              </div>
            )}
          </div>
        ) : (
          // Full view - vertical list with details
          <div className="space-y-2">
            {Object.keys(scripts).length > 0 ? Object.keys(scripts).map((scriptKey) => {
              const script = scripts[scriptKey];
              const isSelected = selectedScript === scriptKey;
              const buttonClasses = getScriptClasses(script.color, isSelected);
              
              return (
                <button
                  key={scriptKey}
                  onClick={() => setSelectedScript(scriptKey)}
                  disabled={loading}
                  className={`
                    w-full px-4 py-3 rounded-md font-semibold text-sm text-left
                    transition-all duration-200 transform hover:scale-[1.02]
                    border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${buttonClasses.button}
                    ${isSelected ? 'shadow-lg ring-2 ring-blue-300' : 'shadow-sm hover:shadow-md'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{script.title}</span>
                    {isSelected && (
                      <span className="ml-2 text-xs opacity-80">✓ Active</span>
                    )}
                  </div>
                  <div className={`text-xs mt-1 opacity-75 ${isSelected ? 'text-white' : ''}`}>
                    {script.category || 'Script'}
                  </div>
                </button>
              );
            }) : (
              <div className={`text-center py-8 ${themeClasses.textSecondary}`}>
                {loading ? '🔄 Loading scripts...' : '📝 No scripts available'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current script display */}
      <div className={`
        border-2 rounded-lg overflow-hidden mb-6
        transition-all duration-300 shadow-md
        ${currentTheme.border}
        ${isExpanded ? 'max-h-none' : 'max-h-40'}
      `}>
        <div className={`
          px-3 py-3 text-white
          ${currentTheme.header}
        `}>
          {/* Header with title */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold truncate pr-2">{currentScript.title}</span>
              {showPersonalized && personalizedScript && (
                <span className="px-2 py-0.5 bg-white/30 border border-white/30 rounded text-xs font-medium">
                  ✨ Personalized
                </span>
              )}
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0 px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                         rounded text-xs transition-all duration-200 hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-white/50"
              title={isExpanded ? 'Collapse script' : 'Expand script'}
            >
              {isExpanded ? '⬆️' : '⬇️'}
            </button>
          </div>
          
          {/* Action buttons row */}
          <div className="flex gap-1 flex-wrap">
            <button 
              onClick={personalizeScript}
              disabled={!apiConnected || isPersonalizing}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                         rounded text-xs transition-all duration-200 hover:scale-105
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-white/50"
              title={!apiConnected ? 'Requires API connection' : isPersonalizing ? 'Personalizing...' : 'Personalize with lead data'}
            >
              {isPersonalizing ? '⏳ Personalizing...' : '🎭 Personalize'}
            </button>
            {personalizedScripts[selectedScript] && (
              <button 
                onClick={() => setShowPersonalized(!showPersonalized)}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                           rounded text-xs transition-all duration-200 hover:scale-105
                           focus:outline-none focus:ring-2 focus:ring-white/50"
                title={showPersonalized ? 'Show original script' : 'Show personalized script'}
              >
                {showPersonalized ? '📝 Original' : '🎭 Personal'}
              </button>
            )}
            <button 
              onClick={copyToClipboard} 
              className="px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                         rounded text-xs transition-all duration-200 hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-white/50"
              title="Copy script to clipboard"
            >
              📋 Copy
            </button>
            {isExpanded && (
              <button 
                onClick={() => setIsExpanded(false)}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                           rounded text-xs transition-all duration-200 hover:scale-105
                           focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                ⬆️ Collapse
              </button>
            )}
          </div>
        </div>
        
        <div className={`p-4 text-sm leading-relaxed font-serif ${
          isDarkMode 
            ? 'bg-gray-900 text-gray-100 border-t border-gray-700' 
            : 'bg-white text-gray-800'
        }`}>
          {loading ? (
            <div className={`text-center py-4 ${themeClasses.textSecondary}`}>
              🔄 Loading script content...
            </div>
          ) : (
            currentScript?.text || 'No script content available'
          )}
        </div>
      </div>

      {/* Quick tips */}
      <div className={`p-4 rounded-lg mb-4 border ${
        isDarkMode 
          ? 'bg-green-900/20 border-green-800 text-green-300'
          : 'bg-green-50 border-green-200 text-green-800'
      }`}>
        <h4 className={`font-semibold text-sm mb-3 ${
          isDarkMode ? 'text-green-300' : 'text-green-800'
        }`}>Quick Tips:</h4>
        <ul className={`space-y-1 text-xs leading-relaxed pl-4 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <li className="flex items-center">
            <span className="text-blue-500 mr-2">🔵</span>
            Blue = Introduction (friendly, professional)
          </li>
          <li className="flex items-center">
            <span className="text-yellow-500 mr-2">🟡</span>
            Yellow = Gatekeeper (persistent but polite)
          </li>
          <li className="flex items-center">
            <span className="text-red-500 mr-2">🔴</span>
            Red = Objections (understanding, solution-focused)
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">🟢</span>
            Green = Closing (confident, clear next steps)
          </li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-4">
        <button 
          onClick={refreshScripts}
          disabled={loading}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
            isDarkMode 
              ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-800'
              : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
          }`}
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh Scripts'}
        </button>
        <button 
          onClick={() => console.log('📥 Script management coming soon!')}
          disabled={!apiConnected}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
            isDarkMode 
              ? 'bg-green-900/30 hover:bg-green-900/50 text-green-300 border border-green-800'
              : 'bg-green-100 hover:bg-green-200 text-green-700'
          }`}
        >
          ⚙️ Manage Scripts
        </button>
      </div>
      
        {/* Customization note */}
        <div className={`p-3 rounded-lg text-center text-sm border ${
          isDarkMode 
            ? 'bg-amber-900/20 border-amber-800 text-amber-300'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          📝 Note: Replace [BRACKETS] with actual information during your call
          {apiConnected && (
            <div className={`mt-1 text-xs ${
              isDarkMode ? 'text-amber-400' : 'text-amber-700'
            }`}>
              ✨ Use "Personalize" button for automatic replacement
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptDisplay;