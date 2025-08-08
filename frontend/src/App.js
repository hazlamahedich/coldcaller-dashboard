import React from 'react';

// Import all our components
import DialPad from './components/DialPad';
import AudioClipPlayer from './components/AudioClipPlayer';
import ScriptDisplay from './components/ScriptDisplay';
import LeadPanel from './components/LeadPanel';

// Main App Component - This is the heart of our application
// It combines all our components into one dashboard

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white py-5 px-5 text-center shadow-soft">
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
          {/* Call statistics (placeholder for now) */}
          <div className="card mt-5">
            <h3 className="text-lg font-medium text-slate-700 text-center m-0 mb-4">Today's Stats</h3>
            <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
              <span>Calls Made:</span>
              <span className="font-bold text-green-600">12</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
              <span>Contacts Reached:</span>
              <span className="font-bold text-green-600">5</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
              <span>Appointments Set:</span>
              <span className="font-bold text-green-600">2</span>
            </div>
          </div>
        </div>

        {/* Right column - Audio clips */}
        <div className="flex-1 min-w-[350px] basis-[400px]">
          <AudioClipPlayer />
          {/* Call log preview (placeholder for now) */}
          <div className="card mt-5">
            <h3 className="text-lg font-medium text-slate-700 text-center m-0 mb-4">Recent Calls</h3>
            <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
              <span>John Smith</span>
              <span className="text-gray-500 text-xs">10:30 AM</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
              <span>Sarah Johnson</span>
              <span className="text-gray-500 text-xs">11:15 AM</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
              <span>Mike Chen</span>
              <span className="text-gray-500 text-xs">2:45 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with helpful tips */}
      <footer className="bg-slate-600 text-white py-5 px-5 text-center">
        <div className="bg-white bg-opacity-10 p-4 rounded-lg mb-2 text-sm leading-relaxed">
          💡 <strong>Quick Start:</strong> Select a lead → Review the script → Dial the number → Use audio clips when needed
        </div>
        <div className="text-xs opacity-80 mt-2">
          Week 2: Tailwind CSS styling - Professional UI with responsive design!
        </div>
      </footer>
    </div>
  );
}

// All styles now converted to Tailwind CSS classes!

export default App;
