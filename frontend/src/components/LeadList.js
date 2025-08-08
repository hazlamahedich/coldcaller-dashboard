import React, { useState, useEffect, useCallback } from 'react';
import { leadsService } from '../services';
import LeadDetailModal from './LeadDetailModal';

/**
 * LeadList - Advanced lead management with grid/card views, search, filters
 * Features: Bulk operations, sorting, pagination, advanced search
 */
const LeadList = ({ onLeadSelect, selectedLead, refreshTrigger }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState(null);

  // Load leads with filters and pagination
  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
        industry: industryFilter,
        sort: sortBy,
        order: sortOrder
      };

      // Remove empty parameters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await leadsService.getAllLeads(params);
      
      if (response.success) {
        setLeads(response.data);
        setTotalLeads(response.pagination?.total || response.data.length);
      } else {
        throw new Error(response.message || 'Failed to load leads');
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, priorityFilter, industryFilter, sortBy, sortOrder]);

  // Initial load and refresh trigger
  useEffect(() => {
    loadLeads();
  }, [loadLeads, refreshTrigger]);

  // Debounced search effect
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
      loadLeads();
    }, 300);

    setSearchDebounce(timeoutId);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, industryFilter, sortBy, sortOrder]);

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
      setLeads(prev => [savedLead, ...prev]);
      setTotalLeads(prev => prev + 1);
    } else {
      setLeads(prev => prev.map(l => l.id === savedLead.id ? savedLead : l));
    }
  };

  // Handle lead delete from modal
  const handleLeadDelete = (leadId) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setTotalLeads(prev => prev - 1);
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
      setLoading(true);
      
      for (const leadId of selectedLeads) {
        if (bulkAction === 'delete') {
          await leadsService.deleteLead(leadId);
        } else {
          // Status update
          await leadsService.updateLeadStatus(leadId, bulkAction);
        }
      }

      // Refresh data
      await loadLeads();
      setSelectedLeads([]);
      setBulkAction('');
    } catch (error) {
      setError(`Failed to ${bulkAction} leads: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge classes
  const getStatusBadge = (status) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'New': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Follow-up': return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'Qualified': return `${baseClasses} bg-green-100 text-green-800`;
      case 'Not Interested': return `${baseClasses} bg-red-100 text-red-800`;
      case 'Closed': return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Get priority indicator
  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'High': return '🔴';
      case 'Medium': return '🟡';
      case 'Low': return '🟢';
      default: return '⚪';
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalLeads);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
            <p className="text-sm text-gray-500 mt-1">
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
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  viewMode === 'card'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex-1"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedLeads.length} lead(s) selected
            </span>
            <div className="flex items-center gap-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded-md text-sm"
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
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadLeads}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading leads...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && leads.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-500 mb-4">
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
                    className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      selectedLead?.id === lead.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleLeadClick(lead)}
                  >
                    {/* Selection checkbox */}
                    <div className="flex items-start justify-between mb-3">
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
                        <span className={getStatusBadge(lead.status)}>
                          {lead.status}
                        </span>
                        <span className="text-lg">
                          {getPriorityIndicator(lead.priority)}
                        </span>
                      </div>
                    </div>

                    {/* Lead info */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {lead.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {lead.company}
                      </p>
                      <p className="text-sm text-gray-500">
                        {lead.phone}
                      </p>
                      {lead.email && (
                        <p className="text-sm text-gray-500 truncate">
                          {lead.email}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {lead.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{lead.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Last contact */}
                    <div className="mt-3 text-xs text-gray-400">
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === leads.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Contact
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedLead?.id === lead.id ? 'bg-blue-50' : ''
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
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        {lead.title && (
                          <div className="text-sm text-gray-500">{lead.title}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(lead.status)}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="flex items-center gap-1">
                          {getPriorityIndicator(lead.priority)}
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {startIndex} to {endIndex} of {totalLeads} leads
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 text-gray-500 rounded-md hover:bg-gray-50 disabled:opacity-50"
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
                  className="px-3 py-2 border border-gray-300 text-gray-500 rounded-md hover:bg-gray-50 disabled:opacity-50"
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