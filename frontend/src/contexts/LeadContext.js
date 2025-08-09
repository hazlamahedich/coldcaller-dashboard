import React, { createContext, useContext, useState, useEffect } from 'react';
import { leadsService } from '../services';
import { dummyLeads } from '../data/dummyData';
import { useSettings } from './SettingsContext';

// Create Lead Context
const LeadContext = createContext();

// Custom hook to use Lead Context
export const useLead = () => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLead must be used within a LeadProvider');
  }
  return context;
};

// Lead Provider Component
export const LeadProvider = ({ children }) => {
  const { useMockData } = useSettings();
  
  // Lead data state
  const [leads, setLeads] = useState([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Loading and API state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load leads from API on component mount or refresh trigger or mock data setting change
  useEffect(() => {
    loadLeads();
  }, [refreshTrigger, useMockData]);

  // Update selected lead when current index changes
  useEffect(() => {
    if (leads.length > 0 && currentLeadIndex >= 0 && currentLeadIndex < leads.length) {
      setSelectedLead(leads[currentLeadIndex]);
    }
  }, [leads, currentLeadIndex]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if mock data is disabled - return empty array for clean production state
      if (!useMockData) {
        console.log('🚫 Mock data disabled - production mode');
        setLeads([]);
        setApiConnected(false);
        setError(null);
        setLoading(false);
        return;
      }
      
      const response = await leadsService.getAllLeads();
      
      if (response.success && response.data) {
        // Handle both array and object responses
        let leadData = [];
        if (Array.isArray(response.data)) {
          leadData = response.data;
        } else if (response.data.leads && Array.isArray(response.data.leads)) {
          leadData = response.data.leads;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          leadData = response.data.data;
        }

        if (leadData.length > 0) {
          setLeads(leadData);
          setApiConnected(true);
          console.log('✅ Leads loaded from API:', leadData.length, 'leads');
        } else {
          // Fallback to dummy data if API returns empty (only if mock data enabled)
          console.log('⚠️ API returned empty data, using dummy data');
          setLeads(dummyLeads);
          setApiConnected(false);
        }
      } else {
        // Fallback to dummy data if API fails (only if mock data enabled)
        console.log('⚠️ API unavailable, using dummy data');
        setLeads(dummyLeads);
        setApiConnected(false);
      }
    } catch (err) {
      console.error('❌ Failed to load leads:', err);
      setError('Failed to load leads from server');
      // Fallback to dummy data (only if mock data enabled)
      if (useMockData) {
        setLeads(dummyLeads);
        setApiConnected(false);
      } else {
        setLeads([]);
        setApiConnected(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const nextLead = () => {
    if (currentLeadIndex < leads.length - 1) {
      setCurrentLeadIndex(currentLeadIndex + 1);
      setError(null);
    }
  };

  const previousLead = () => {
    if (currentLeadIndex > 0) {
      setCurrentLeadIndex(currentLeadIndex - 1);
      setError(null);
    }
  };

  const goToLead = (index) => {
    if (index >= 0 && index < leads.length) {
      setCurrentLeadIndex(index);
      setError(null);
    }
  };

  const selectLead = (lead) => {
    const index = leads.findIndex(l => l.id === lead.id);
    if (index !== -1) {
      setCurrentLeadIndex(index);
      setSelectedLead(lead);
    }
  };

  // Update functions
  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      setError(null);
      
      if (apiConnected) {
        // Save to API if connected
        const response = await leadsService.updateLeadStatus(leadId, newStatus);
        
        if (response.success) {
          // Update local state with new status
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === leadId ? { ...lead, status: newStatus } : lead
            )
          );
          
          // Also update selectedLead if it's the same lead
          setSelectedLead(prevSelected => 
            prevSelected && prevSelected.id === leadId 
              ? { ...prevSelected, status: newStatus }
              : prevSelected
          );
          
          console.log(`✅ Lead status updated to: ${newStatus}`);
          return { success: true };
        } else {
          throw new Error(response.message || 'Failed to update status');
        }
      } else {
        // Update local dummy data as fallback
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
        
        // Also update selectedLead if it's the same lead
        setSelectedLead(prevSelected => 
          prevSelected && prevSelected.id === leadId 
            ? { ...prevSelected, status: newStatus }
            : prevSelected
        );
        
        console.log(`💾 Lead status updated locally to: ${newStatus} (API unavailable)`);
        return { success: true };
      }
    } catch (err) {
      console.error('❌ Failed to update lead status:', err);
      setError(`Failed to update status: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  const updateLeadNotes = async (leadId, notes) => {
    try {
      setError(null);
      
      if (apiConnected) {
        // Save to API if connected
        const response = await leadsService.updateLeadNotes(leadId, notes);
        
        if (response.success) {
          // Update local state with new notes
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === leadId ? { ...lead, notes: notes } : lead
            )
          );
          
          console.log('✅ Notes saved to API successfully');
          return { success: true };
        } else {
          throw new Error(response.message || 'Failed to save notes');
        }
      } else {
        // Update local dummy data as fallback
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId ? { ...lead, notes: notes } : lead
          )
        );
        
        console.log('💾 Notes saved locally (API unavailable)');
        return { success: true };
      }
    } catch (err) {
      console.error('❌ Failed to save notes:', err);
      setError(`Failed to save notes: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  const addLead = (newLead) => {
    setLeads(prevLeads => [newLead, ...prevLeads]);
  };

  const updateLead = (updatedLead) => {
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === updatedLead.id ? updatedLead : lead
      )
    );
  };

  const deleteLead = (leadId) => {
    setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
    // Adjust current index if necessary
    if (currentLeadIndex >= leads.length - 1) {
      setCurrentLeadIndex(Math.max(0, leads.length - 2));
    }
  };

  const refreshLeads = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getCurrentLead = () => {
    return leads[currentLeadIndex] || dummyLeads[0];
  };

  const contextValue = {
    // Data state
    leads,
    currentLeadIndex,
    selectedLead,
    loading,
    error,
    apiConnected,
    
    // Navigation functions
    nextLead,
    previousLead,
    goToLead,
    selectLead,
    getCurrentLead,
    
    // Update functions
    updateLeadStatus,
    updateLeadNotes,
    addLead,
    updateLead,
    deleteLead,
    
    // Utility functions
    refreshLeads,
    loadLeads,
    
    // Computed values
    hasNextLead: currentLeadIndex < leads.length - 1,
    hasPreviousLead: currentLeadIndex > 0,
    totalLeads: leads.length
  };

  return (
    <LeadContext.Provider value={contextValue}>
      {children}
    </LeadContext.Provider>
  );
};

export default LeadContext;