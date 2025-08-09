import React, { useState, useEffect } from 'react';
import { leadsService } from '../services';
import { useTheme } from '../contexts/ThemeContext';
import { useLead } from '../contexts/LeadContext';
import LeadDetailModal from './LeadDetailModal';

/**
 * LeadList - Advanced lead management with grid/card views, search, filters
 * Features: Bulk operations, sorting, pagination, advanced search
 */
const LeadList = ({ onLeadSelect, selectedLead }) => {
  const { isDarkMode, themeClasses } = useTheme();
  const { leads, loading, error, addLead, updateLead, deleteLead } = useLead();
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  
  // Search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [totalLeads, setTotalLeads] = useState(0);
  
  // Bulk operations
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  
  // Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLeadForModal, setSelectedLeadForModal] = useState(null);
  const [isNewLead, setIsNewLead] = useState(false);


  // Update totalLeads when leads change
  useEffect(() => {
    setTotalLeads(leads.length);
  }, [leads]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, industryFilter, sortBy, sortOrder, searchTerm]);

  // Handle lead selection
  const handleLeadClick = (lead) => {
    if (onLeadSelect) {
      onLeadSelect(lead);
    }
    setSelectedLeadForModal(lead);
    setIsNewLead(false);
    setShowDetailModal(true);
  };

  // Handle new lead
  const handleNewLead = () => {
    setSelectedLeadForModal(null);
    setIsNewLead(true);
    setShowDetailModal(true);
  };

  // Handle lead save from modal
  const handleLeadSave = (savedLead) => {
    if (isNewLead) {
      addLead(savedLead);
    } else {
      updateLead(savedLead);
    }
  };

  // Handle lead delete from modal
  const handleLeadDelete = (leadId) => {
    deleteLead(leadId);
    setSelectedLeads(prev => prev.filter(id => id !== leadId));
  };

  // Handle bulk selection
  const handleBulkSelect = (leadId, checked) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedLeads.length === 0) return;

    const confirmMessage = `Are you sure you want to ${bulkAction} ${selectedLeads.length} lead(s)?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      for (const leadId of selectedLeads) {
        if (bulkAction === 'delete') {
          await leadsService.deleteLead(leadId);
          deleteLead(leadId);
        } else {
          // Status update
          await leadsService.updateLeadStatus(leadId, bulkAction);
          const leadToUpdate = leads.find(l => l.id === leadId);
          if (leadToUpdate) {
            updateLead({ ...leadToUpdate, status: bulkAction });
          }
        }
      }

      setSelectedLeads([]);
      setBulkAction('');
    } catch (error) {
      console.error(`Failed to ${bulkAction} leads:`, error);
    }
  };

  // Get status badge classes with dark mode support
  const getStatusBadge = (status) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    const darkModeClasses = isDarkMode ? 'border' : '';
    switch (status) {
      case 'New': 
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-blue-900/40 text-blue-200 border-blue-700` 
          : `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Follow-up': 
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-orange-900/40 text-orange-200 border-orange-700` 
          : `${baseClasses} bg-orange-100 text-orange-800`;
      case 'Qualified': 
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-green-900/40 text-green-200 border-green-700` 
          : `${baseClasses} bg-green-100 text-green-800`;
      case 'Not Interested': 
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-red-900/40 text-red-200 border-red-700` 
          : `${baseClasses} bg-red-100 text-red-800`;
      case 'Closed': 
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-gray-700/40 text-gray-200 border-gray-600` 
          : `${baseClasses} bg-gray-100 text-gray-800`;
      default: 
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-gray-700/40 text-gray-200 border-gray-600` 
          : `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Get priority indicator (emoji for quick reference)
  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'High': return '🔴';
      case 'Medium': return '🟡';
      case 'Low': return '🟢';
      default: return '⚪';
    }
  };

  // Get priority badge with proper colors
  const getPriorityBadge = (priority) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    const darkModeClasses = isDarkMode ? 'border' : '';
    switch (priority) {
      case 'High':
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-red-900/40 text-red-200 border-red-700`
          : `${baseClasses} bg-red-100 text-red-800`;
      case 'Medium':
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-yellow-900/40 text-yellow-200 border-yellow-700`
          : `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Low':
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-green-900/40 text-green-200 border-green-700`
          : `${baseClasses} bg-green-100 text-green-800`;
      default:
        return isDarkMode 
          ? `${baseClasses} ${darkModeClasses} bg-gray-700/40 text-gray-200 border-gray-600`
          : `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalLeads);

  return (
    <div className={`${themeClasses.cardBg} rounded-lg shadow-sm`}>
      {/* Header */}
      <div className={`p-6 border-b ${
        isDarkMode ? 'border-gray-600' : 'border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-bold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>Leads</h2>
            <p className={`text-sm mt-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {totalLeads} total leads
              {selectedLeads.length > 0 && ` • ${selectedLeads.length} selected`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* New Lead Button */}
            <button
              onClick={handleNewLead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Lead
            </button>

            {/* View Mode Toggle */}
            <div className={`flex rounded-lg p-1 ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  viewMode === 'card'
                    ? isDarkMode
                      ? 'bg-gray-700 text-gray-100 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-gray-100'
                      : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  viewMode === 'table'
                    ? isDarkMode
                      ? 'bg-gray-700 text-gray-100 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-gray-100'
                      : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Qualified">Qualified</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('_');
                setSortBy(field);
                setSortOrder(order);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="updated_at_desc">Latest Updated</option>
              <option value="created_at_desc">Recently Added</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="company_asc">Company A-Z</option>
              <option value="priority_desc">Priority High-Low</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setPriorityFilter('');
                setIndustryFilter('');
                setSortBy('updated_at');
                setSortOrder('desc');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 border rounded-lg flex-1 ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className={`mt-4 p-4 rounded-lg flex items-center justify-between ${
            isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50'
          }`}>
            <span className={`text-sm font-medium ${
              isDarkMode ? 'text-blue-200' : 'text-blue-900'
            }`}>
              {selectedLeads.length} lead(s) selected
            </span>
            <div className="flex items-center gap-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className={`px-3 py-1 border rounded-md text-sm ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-gray-100' 
                    : 'border-blue-300 bg-white text-gray-900'
                }`}
              >
                <option value="">Choose action</option>
                <option value="Follow-up">Mark as Follow-up</option>
                <option value="Qualified">Mark as Qualified</option>
                <option value="Not Interested">Mark as Not Interested</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={`p-4 border-l-4 ${
          isDarkMode 
            ? 'bg-red-900/20 border-red-600' 
            : 'bg-red-50 border-red-400'
        }`}>
          <p className={`${
            isDarkMode ? 'text-red-200' : 'text-red-800'
          }`}>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-2 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>Loading leads...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && leads.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className={`text-lg font-semibold mb-2 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>No leads found</h3>
          <p className={`mb-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {searchTerm || statusFilter || priorityFilter
              ? "Try adjusting your search criteria"
              : "Get started by adding your first lead"}
          </p>
          <button
            onClick={handleNewLead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add New Lead
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && leads.length > 0 && (
        <>
          {/* Card View */}
          {viewMode === 'card' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      selectedLead?.id === lead.id 
                        ? isDarkMode 
                          ? 'border-blue-400 bg-blue-900/20' 
                          : 'border-blue-500 bg-blue-50'
                        : isDarkMode 
                          ? 'border-gray-600 bg-gray-800'
                          : 'border-gray-200 bg-white'
                    }`}
                    onClick={() => handleLeadClick(lead)}
                  >
                    {/* Header with checkbox and status */}
                    <div className="flex items-center justify-between mb-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleBulkSelect(lead.id, e.target.checked);
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex items-center gap-2">
                        <span className={getPriorityBadge(lead.priority)}>
                          {getPriorityIndicator(lead.priority)} {lead.priority || 'None'}
                        </span>
                        <span className={getStatusBadge(lead.status)}>
                          {lead.status}
                        </span>
                      </div>
                    </div>

                    {/* Lead info - properly spaced */}
                    <div className="space-y-3">
                      <div>
                        <h3 className={`font-semibold text-base leading-tight ${
                          isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          {lead.name}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {lead.company}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          📞 {lead.phone}
                        </p>
                        {lead.email && (
                          <p className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            ✉️ {lead.email.length > 25 ? lead.email.substring(0, 25) + '...' : lead.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {lead.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded ${
                              isDarkMode 
                                ? 'bg-gray-700/50 text-gray-200 border border-gray-600' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className={`px-2 py-1 text-xs rounded ${
                            isDarkMode 
                              ? 'bg-gray-700/50 text-gray-200 border border-gray-600' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            +{lead.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Last contact */}
                    <div className={`mt-3 text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {lead.last_contact
                        ? `Last contact: ${new Date(lead.last_contact).toLocaleDateString()}`
                        : 'No contact yet'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === leads.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className={`rounded ${
                          isDarkMode ? 'border-gray-600' : 'border-gray-300'
                        }`}
                      />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Name
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Company
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Priority
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Phone
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Last Contact
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDarkMode ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'
                }`}>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`cursor-pointer ${
                        selectedLead?.id === lead.id 
                          ? isDarkMode 
                            ? 'bg-blue-900/20' 
                            : 'bg-blue-50'
                          : isDarkMode 
                            ? 'hover:bg-gray-800' 
                            : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleLeadClick(lead)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleBulkSelect(lead.id, e.target.checked);
                          }}
                          className={`rounded ${
                            isDarkMode ? 'border-gray-600' : 'border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-medium ${
                          isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>{lead.name}</div>
                        {lead.title && (
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>{lead.title}</div>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {lead.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(lead.status)}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getPriorityBadge(lead.priority)}>
                          {getPriorityIndicator(lead.priority)} {lead.priority || 'None'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {lead.phone}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {lead.last_contact
                          ? new Date(lead.last_contact).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-6 py-4 border-t flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Showing {startIndex} to {endIndex} of {totalLeads} leads
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 border rounded-md disabled:opacity-50 ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 border rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDarkMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 border rounded-md disabled:opacity-50 ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLeadForModal}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLeadForModal(null);
          setIsNewLead(false);
        }}
        onSave={handleLeadSave}
        onDelete={handleLeadDelete}
        isNewLead={isNewLead}
      />
    </div>
  );
};

export default LeadList;