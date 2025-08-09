import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLead } from '../contexts/LeadContext';
import LeadList from '../components/LeadList';
import LeadKanban from '../components/LeadKanban';
import LeadAnalyticsDashboard from '../components/LeadAnalyticsDashboard';

// Inner component that uses the Lead context
const ManageLeadsContent = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const { selectLead, selectedLead, refreshLeads } = useLead();
  const [viewMode, setViewMode] = useState('list'); // 'list', 'kanban', 'analytics'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Handler for lead selection from LeadList component
  const handleLeadSelect = (lead) => {
    selectLead(lead);
  };

  // Handler to refresh the lead list
  const handleRefresh = () => {
    refreshLeads();
    setRefreshTrigger(prev => prev + 1); // Trigger refresh in child components
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with view mode toggle */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${themeClasses.textPrimary}`}>Manage Leads</h1>
              <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                Comprehensive lead management with advanced features
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className={`flex rounded-lg p-1 ${themeClasses.cardBg} border ${themeClasses.border}`}>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 List View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                🗂️ Kanban
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'analytics'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Analytics
              </button>
            </div>
          </div>
        </div>

        {/* View Components */}
        <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border}`}>
          {viewMode === 'list' && (
            <LeadList
              onLeadSelect={handleLeadSelect}
              selectedLead={selectedLead}
            />
          )}

          {viewMode === 'kanban' && (
            <LeadKanban
              onLeadSelect={handleLeadSelect}
              selectedLead={selectedLead}
              refreshTrigger={refreshTrigger}
            />
          )}

          {viewMode === 'analytics' && (
            <LeadAnalyticsDashboard />
          )}
        </div>

        {/* Refresh button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleRefresh}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

// Export the ManageLeadsContent as ManageLeads (LeadProvider is now in App.js)
const ManageLeads = ManageLeadsContent;

export default ManageLeads;