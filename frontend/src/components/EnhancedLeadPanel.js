import React, { useState, useEffect } from 'react';
import { leadsService } from '../services';
import { dummyLeads } from '../data/dummyData';
import LeadDetailModal from './LeadDetailModal';
import LeadList from './LeadList';
import LeadImportExport from './LeadImportExport';
import LeadAnalyticsDashboard from './LeadAnalyticsDashboard';

/**
 * EnhancedLeadPanel - Complete CRM interface with all lead management capabilities
 * Features: Lead details, list management, analytics, import/export, timeline
 */
const EnhancedLeadPanel = () => {
  // Main state
  const [leads, setLeads] = useState([]);
  const [currentLead, setCurrentLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  
  // View state
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, list, analytics
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  
  // Data refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load leads from API on component mount
  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await leadsService.getAllLeads({ limit: 100 });
      
      if (response.success && response.data) {
        // Handle the nested data structure: response.data.leads contains the array
        const leadsArray = response.data.leads || response.data || [];
        
        if (Array.isArray(leadsArray) && leadsArray.length > 0) {
          setLeads(leadsArray);
          setCurrentLead(leadsArray[0]);
          setApiConnected(true);
          console.log('✅ Leads loaded from API:', leadsArray.length, 'leads');
        } else {
          console.log('⚠️ No leads found in API response');
          // Fallback to dummy data if no leads
          setLeads(dummyLeads);
          setCurrentLead(dummyLeads[0]);
          setApiConnected(false);
        }
      } else {
        // Fallback to dummy data if API fails or returns no data
        console.log('⚠️ API unavailable, using dummy data');
        setLeads(dummyLeads);
        setCurrentLead(dummyLeads[0]);
        setApiConnected(false);
      }
    } catch (err) {
      console.error('❌ Failed to load leads:', err);
      setError('Failed to load leads from server');
      // Fallback to dummy data
      setLeads(dummyLeads);
      setCurrentLead(dummyLeads[0]);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle lead selection
  const handleLeadSelect = (lead) => {
    setCurrentLead(lead);
  };

  // Handle lead update
  const handleLeadUpdate = (updatedLead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    if (currentLead && currentLead.id === updatedLead.id) {
      setCurrentLead(updatedLead);
    }
    triggerRefresh();
  };

  // Handle lead creation
  const handleLeadCreate = (newLead) => {
    setLeads(prev => [newLead, ...prev]);
    setCurrentLead(newLead);
    triggerRefresh();
  };

  // Handle lead deletion
  const handleLeadDelete = (leadId) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (currentLead && currentLead.id === leadId) {
      const remainingLeads = leads.filter(l => l.id !== leadId);
      setCurrentLead(remainingLeads[0] || null);
    }
    triggerRefresh();
  };

  // Trigger data refresh
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    loadLeads();
  };

  // Handle import completion
  const handleImportComplete = (importedLeads, failedLeads) => {
    if (importedLeads.length > 0) {
      setLeads(prev => [...importedLeads, ...prev]);
      setCurrentLead(importedLeads[0]);
      triggerRefresh();
    }
    setShowImportExport(false);
  };

  // Get view title and icon
  const getViewInfo = (view) => {
    switch (view) {
      case 'dashboard':
        return { title: 'Lead Dashboard', icon: '📊' };
      case 'list':
        return { title: 'Lead Management', icon: '📋' };
      case 'analytics':
        return { title: 'Analytics & Insights', icon: '📈' };
      default:
        return { title: 'Leads', icon: '👥' };
    }
  };

  const viewInfo = getViewInfo(activeView);

  return (
    <div className="flex flex-col h-full max-w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{viewInfo.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{viewInfo.title}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-500">
                  {leads.length} total leads
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  apiConnected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {apiConnected ? '🟢 API Connected' : '🟡 Offline Mode'}
                </span>
                {loading && (
                  <span className="text-xs text-blue-600">🔄 Refreshing...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'analytics'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📈 Analytics
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setShowImportExport(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                📤 Import/Export
              </button>
              
              <button
                onClick={() => {
                  setCurrentLead(null);
                  setShowDetailModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                New Lead
              </button>
              
              <button
                onClick={triggerRefresh}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-red-800">⚠️ {error}</p>
              <button 
                onClick={triggerRefresh} 
                className="text-red-600 hover:text-red-800 underline text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <div className="h-full p-6 space-y-6 overflow-y-auto">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Qualified</p>
                    <p className="text-2xl font-bold text-green-600">
                      {leads.filter(l => l.status === 'Qualified').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <span className="text-2xl">📞</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Follow-up</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {leads.filter(l => l.status === 'Follow-up').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conversion</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {leads.length > 0 ? 
                        ((leads.filter(l => l.status === 'Qualified').length / leads.length) * 100).toFixed(1)
                        : '0'
                      }%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Lead Card */}
            {currentLead && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Current Lead</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <h4 className="text-xl font-bold text-gray-900">{currentLead.name}</h4>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                          currentLead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                          currentLead.status === 'Follow-up' ? 'bg-orange-100 text-orange-800' :
                          currentLead.status === 'Qualified' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {currentLead.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Company:</span>
                          <span className="ml-2 text-gray-900">{currentLead.company}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Phone:</span>
                          <span className="ml-2 text-gray-900">{currentLead.phone}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Email:</span>
                          <span className="ml-2 text-gray-900">{currentLead.email}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Last Contact:</span>
                          <span className="ml-2 text-gray-900">
                            {currentLead.last_contact ? 
                              new Date(currentLead.last_contact).toLocaleDateString() : 
                              'Never'
                            }
                          </span>
                        </div>
                      </div>

                      {currentLead.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{currentLead.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => {
                          setShowDetailModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {/* Call functionality */}}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        📞 Call
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Leads */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
                  <button
                    onClick={() => setActiveView('list')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View All →
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {leads.slice(0, 5).map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleLeadSelect(lead)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        currentLead?.id === lead.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{lead.name}</h4>
                          <p className="text-sm text-gray-600">{lead.company}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'Follow-up' ? 'bg-orange-100 text-orange-800' :
                            lead.status === 'Qualified' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'list' && (
          <div className="h-full">
            <LeadList
              onLeadSelect={handleLeadSelect}
              selectedLead={currentLead}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="h-full p-6 overflow-y-auto">
            <LeadAnalyticsDashboard />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <LeadDetailModal
        lead={currentLead}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onSave={handleLeadUpdate}
        onDelete={handleLeadDelete}
        isNewLead={currentLead === null}
      />

      {/* Import/Export Modal */}
      <LeadImportExport
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default EnhancedLeadPanel;