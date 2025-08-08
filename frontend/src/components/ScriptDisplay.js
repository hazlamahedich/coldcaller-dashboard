import React, { useState } from 'react';
import { dummyScripts } from '../data/dummyData';

// ScriptDisplay Component - Shows color-coded call scripts
// Helps you know what to say during different parts of the call

const ScriptDisplay = () => {
  // Track which script is currently selected
  const [selectedScript, setSelectedScript] = useState('introduction');
  // Track if the script is expanded for easier reading
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the current script data
  const currentScript = dummyScripts[selectedScript];

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
  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentScript.text);
    alert('Script copied to clipboard!');
  };

  const currentTheme = getScriptClasses(currentScript.color);

  return (
    <div className="card max-w-lg mx-2">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">Call Scripts</h2>
      
      {/* Script selection buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Object.keys(dummyScripts).map((scriptKey) => {
          const script = dummyScripts[scriptKey];
          const isSelected = selectedScript === scriptKey;
          const buttonClasses = getScriptClasses(script.color, isSelected);
          
          return (
            <button
              key={scriptKey}
              onClick={() => setSelectedScript(scriptKey)}
              className={`
                px-4 py-3 rounded-md font-semibold text-sm
                transition-all duration-200 transform hover:scale-105
                border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2
                ${buttonClasses.button}
                ${isSelected ? 'shadow-md' : 'shadow-sm hover:shadow-md'}
              `}
            >
              {script.title}
            </button>
          );
        })}
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
          {currentScript.text}
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

      {/* Customization note */}
      <div className="bg-amber-50 p-3 rounded-lg text-center text-sm text-amber-800 border border-amber-200">
        📝 Note: Replace [BRACKETS] with actual information during your call
      </div>
    </div>
  );
};

export default ScriptDisplay;