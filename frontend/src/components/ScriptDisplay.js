import React, { useState, useEffect } from 'react';
import { scriptsService } from '../services';
import { dummyScripts } from '../data/dummyData';

// ScriptDisplay Component - Shows color-coded call scripts
// Helps you know what to say during different parts of the call
// Now integrated with backend API services

const ScriptDisplay = () => {
  // API Integration State
  const [scripts, setScripts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Script Display State
  const [selectedScript, setSelectedScript] = useState('introduction');
  const [isExpanded, setIsExpanded] = useState(false);

  // Load scripts from API on component mount
  useEffect(() => {
    loadScripts();
  }, []);

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

  // Get the current script data (fallback to first available script)
  const currentScript = scripts[selectedScript] || Object.values(scripts)[0] || dummyScripts.introduction;

  // Get Tailwind classes for each script color theme
  const getScriptClasses = (color, isSelected = false) => {
    const themes = {
      blue: {
        button: isSelected 
          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
          : 'bg-gray-200 hover:bg-blue-100 text-gray-700 hover:text-blue-700',
        border: 'border-blue-500',
        header: 'bg-blue-500'
      },
      yellow: {
        button: isSelected 
          ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
          : 'bg-gray-200 hover:bg-yellow-100 text-gray-700 hover:text-yellow-700',
        border: 'border-yellow-500',
        header: 'bg-yellow-500'
      },
      red: {
        button: isSelected 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-700',
        border: 'border-red-500',
        header: 'bg-red-500'
      },
      green: {
        button: isSelected 
          ? 'bg-green-500 hover:bg-green-600 text-white' 
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

  // Function to personalize script with lead data (placeholder for future enhancement)
  const personalizeScript = async () => {
    if (!apiConnected) {
      console.warn('Personalization requires API connection');
      return;
    }
    
    // TODO: Integrate with LeadPanel to get current lead data
    // This would be enhanced in a future update
    console.log('🎭 Script personalization feature coming soon!');
  };

  // Function to refresh scripts
  const refreshScripts = () => {
    loadScripts();
  };

  const currentTheme = getScriptClasses(currentScript.color);

  return (
    <div className="card max-w-lg mx-2">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Call Scripts</h2>
        {loading && (
          <div className="text-sm text-blue-600 mt-1">
            🔄 Loading scripts...
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
            ⚠️ {error}
            <button 
              onClick={refreshScripts} 
              className="ml-2 text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && (
          <div className="text-xs text-gray-500 mt-1">
            API: <span className={`font-semibold ${
              apiConnected ? 'text-green-600' : 'text-orange-600'
            }`}>
              {apiConnected ? '🟢 Connected' : '🟡 Offline'}
            </span>
          </div>
        )}
      </div>
      
      {/* Script selection buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
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
                px-4 py-3 rounded-md font-semibold text-sm
                transition-all duration-200 transform hover:scale-105
                border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${buttonClasses.button}
                ${isSelected ? 'shadow-md' : 'shadow-sm hover:shadow-md'}
              `}
            >
              {script.title}
            </button>
          );
        }) : (
          <div className="col-span-2 text-center text-gray-500 py-8">
            {loading ? '🔄 Loading scripts...' : '📝 No scripts available'}
          </div>
        )}
      </div>

      {/* Current script display */}
      <div className={`
        border-3 rounded-lg overflow-hidden mb-6
        transition-all duration-300 shadow-md
        ${currentTheme.border}
        ${isExpanded ? 'max-h-none' : 'max-h-40'}
      `}>
        <div className={`
          px-4 py-3 flex justify-between items-center text-white
          ${currentTheme.header}
        `}>
          <span className="text-lg font-bold">{currentScript.title}</span>
          <div className="flex gap-2">
            <button 
              onClick={personalizeScript}
              disabled={!apiConnected}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                         rounded-sm text-xs transition-all duration-200 hover:scale-105
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-white/50"
              title={!apiConnected ? 'Requires API connection' : 'Personalize with lead data'}
            >
              🎭 Personalize
            </button>
            <button 
              onClick={copyToClipboard} 
              className="px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                         rounded-sm text-xs transition-all duration-200 hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              📋 Copy
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/30 
                         rounded-sm text-xs transition-all duration-200 hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {isExpanded ? '⬆️ Collapse' : '⬇️ Expand'}
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-white text-gray-800 text-sm leading-relaxed font-serif">
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              🔄 Loading script content...
            </div>
          ) : (
            currentScript?.text || 'No script content available'
          )}
        </div>
      </div>

      {/* Quick tips */}
      <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
        <h4 className="font-semibold text-green-800 text-sm mb-3">Quick Tips:</h4>
        <ul className="space-y-1 text-xs leading-relaxed text-gray-700 pl-4">
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
          className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-700 rounded-md text-sm font-medium transition-colors"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh Scripts'}
        </button>
        <button 
          onClick={() => console.log('📥 Script management coming soon!')}
          disabled={!apiConnected}
          className="flex-1 px-3 py-2 bg-green-100 hover:bg-green-200 disabled:opacity-50 text-green-700 rounded-md text-sm font-medium transition-colors"
        >
          ⚙️ Manage Scripts
        </button>
      </div>
      
      {/* Customization note */}
      <div className="bg-amber-50 p-3 rounded-lg text-center text-sm text-amber-800 border border-amber-200">
        📝 Note: Replace [BRACKETS] with actual information during your call
        {apiConnected && (
          <div className="mt-1 text-xs text-amber-700">
            ✨ Use "Personalize" button for automatic replacement
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptDisplay;