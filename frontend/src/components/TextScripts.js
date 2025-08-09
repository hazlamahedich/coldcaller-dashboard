import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// TextScripts Component - Interactive script selection for cold calling
// Based on dashboard_2.html design with professional styling and functionality

const TextScripts = () => {
  // Theme context for light/dark mode support
  const { isDarkMode, themeClasses } = useTheme();
  
  // State management
  const [selectedScript, setSelectedScript] = useState('introduction');
  const [scripts] = useState({
    introduction: {
      title: "Opening Introduction",
      category: "opening",
      text: "Hi, this is [Your Name] from [Company]. I hope you're having a great day. I'm calling because we help businesses like yours reduce costs by up to 30% while improving efficiency. Do you have 2 minutes to hear how we might be able to help you?",
      color: "blue"
    },
    benefits: {
      title: "Product Benefits",
      category: "pitch", 
      text: "Our solution has helped over 500 companies save an average of $50,000 annually. The key benefits include automated processes, real-time reporting, and 24/7 support. Most clients see results within the first 30 days.",
      color: "green"
    },
    objection_price: {
      title: "Objection: Price",
      category: "objection",
      text: "I understand budget is always a concern. The question is, what's the cost of not taking action? Based on your current situation, you could be losing $X per month. Our solution typically pays for itself within 3 months.",
      color: "red"
    },
    objection_interest: {
      title: "Objection: Not Interested", 
      category: "objection",
      text: "I completely understand - you probably get a lot of sales calls. But this isn't just another pitch. We've specifically researched your industry and have a solution that's working for your competitors. Can I share just one quick example?",
      color: "red"
    },
    closing_demo: {
      title: "Closing - Demo Request",
      category: "closing",
      text: "Based on our conversation, it sounds like this could be a perfect fit for your business. I'd love to show you exactly how this works with a quick 15-minute demo. Are you available this Thursday at 2 PM or would Friday at 10 AM work better?",
      color: "green"
    },
    followup_thanks: {
      title: "Follow-up Thank You",
      category: "followup",
      text: "Thank you so much for your time today. I'll send you the information we discussed via email within the next hour. I'll also follow up on [specific date] to see if you have any questions. Have a wonderful rest of your day!",
      color: "blue"
    }
  });

  // Get current selected script
  const currentScript = scripts[selectedScript];

  // Copy script to clipboard functionality
  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(currentScript.text);
      
      // Show success notification
      showNotification('Script copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy script:', err);
      showNotification('Failed to copy script', 'error');
    }
  };

  // Show notification helper
  const showNotification = (message, type = 'info') => {
    // Create notification element
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-md shadow-lg z-50 transition-all duration-300`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification
    setTimeout(() => {
      notification.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  // Get color classes based on script color
  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-500',
        hover: 'hover:bg-blue-600',
        border: 'border-blue-500',
        text: 'text-blue-600',
        lightBg: 'bg-blue-50 dark:bg-blue-900/20'
      },
      green: {
        bg: 'bg-green-500', 
        hover: 'hover:bg-green-600',
        border: 'border-green-500',
        text: 'text-green-600',
        lightBg: 'bg-green-50 dark:bg-green-900/20'
      },
      red: {
        bg: 'bg-red-500',
        hover: 'hover:bg-red-600', 
        border: 'border-red-500',
        text: 'text-red-600',
        lightBg: 'bg-red-50 dark:bg-red-900/20'
      },
      yellow: {
        bg: 'bg-yellow-500',
        hover: 'hover:bg-yellow-600',
        border: 'border-yellow-500', 
        text: 'text-yellow-600',
        lightBg: 'bg-yellow-50 dark:bg-yellow-900/20'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`card p-6 ${themeClasses.cardBg} ${themeClasses.border}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
          Call Scripts
        </h2>
        <button 
          className={`btn-secondary flex items-center px-3 py-2 ${themeClasses.buttonSecondary} rounded-md text-sm font-medium transition-colors hover:scale-105`}
          onClick={() => showNotification('New Script feature coming soon!', 'info')}
          aria-label="Create new script"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Script
        </button>
      </div>

      {/* Script Grid - Responsive selection buttons */}
      <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
        {Object.entries(scripts).map(([scriptKey, script]) => {
          const isSelected = selectedScript === scriptKey;
          const colors = getColorClasses(script.color);
          
          return (
            <div
              key={scriptKey}
              className={`script-card cursor-pointer p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? `border-2 ${colors.border} ${colors.lightBg}` 
                  : `border ${themeClasses.border} ${themeClasses.hover}`
              }`}
              onClick={() => setSelectedScript(scriptKey)}
              aria-label={`Select ${script.title} script`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedScript(scriptKey);
                }
              }}
            >
              <h3 className={`font-semibold text-sm mb-2 ${isSelected ? colors.text : themeClasses.textPrimary}`}>
                {script.title}
              </h3>
              <p className={`text-sm line-clamp-3 ${themeClasses.textSecondary}`}>
                {script.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Selected Script Display */}
      {currentScript && (
        <div className={`border rounded-lg overflow-hidden mb-6 ${getColorClasses(currentScript.color).border}`}>
          {/* Script Header */}
          <div className={`px-4 py-3 flex justify-between items-center text-white ${getColorClasses(currentScript.color).bg}`}>
            <span className="text-lg font-bold">{currentScript.title}</span>
            <button
              onClick={handleCopyScript}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/30 rounded-sm text-xs transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Copy script to clipboard"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
          
          {/* Script Content */}
          <div className={`p-4 ${themeClasses.cardBg} ${themeClasses.textPrimary} text-sm leading-relaxed`}>
            {currentScript.text}
          </div>
        </div>
      )}

      {/* Script Categories Guide */}
      <div className={`${themeClasses.cardBg} p-4 rounded-lg mb-4 border ${themeClasses.border}`}>
        <h4 className={`font-semibold text-sm mb-3 ${themeClasses.textPrimary}`}>Script Categories:</h4>
        <ul className="space-y-1 text-xs leading-relaxed">
          <li className="flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
            <span className={themeClasses.textSecondary}>
              <strong>Opening/Follow-up:</strong> Professional introduction and thank you messages
            </span>
          </li>
          <li className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
            <span className={themeClasses.textSecondary}>
              <strong>Benefits/Closing:</strong> Product value proposition and deal closing
            </span>
          </li>
          <li className="flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-3"></span>
            <span className={themeClasses.textSecondary}>
              <strong>Objections:</strong> Handle common customer concerns and pushback
            </span>
          </li>
        </ul>
      </div>

      {/* Usage Tips */}
      <div className={`p-3 rounded-lg text-center text-sm ${isDarkMode ? 'bg-amber-900/20 text-amber-200 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200'} border`}>
        <div className="flex items-center justify-center mb-2">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <strong>Pro Tip:</strong>
        </div>
        <div>Replace [bracketed] placeholders with actual lead information for personalized conversations</div>
      </div>
    </div>
  );
};

export default TextScripts;