import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { notesService } from '../services';

// Advanced Note Search and Analytics Interface
const NoteSearchInterface = ({ leadId, onNoteSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Advanced search options
  const [searchOptions, setSearchOptions] = useState({
    includeContent: true,
    includeTags: true,
    includeType: true,
    caseSensitive: false,
    useRegex: false,
    searchArchived: false
  });
  
  // Filters
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: '',
      preset: 'all' // all, today, week, month, quarter, year
    },
    noteTypes: [],
    tags: [],
    qualityRange: { min: 0, max: 100 },
    outcomes: [],
    authors: [],
    hasFollowUp: null, // null, true, false
    hasActionItems: null
  });
  
  // Search mode
  const [searchMode, setSearchMode] = useState('simple'); // simple, advanced, boolean
  const [booleanQuery, setBooleanQuery] = useState('');
  
  // Sort options
  const [sortBy, setSortBy] = useState('date'); // date, quality, relevance, length
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  
  // Display options
  const [viewMode, setViewMode] = useState('list'); // list, grid, timeline
  const [groupBy, setGroupBy] = useState('none'); // none, date, type, author, quality
  
  // Analytics
  const [analytics, setAnalytics] = useState({
    totalNotes: 0,
    averageQuality: 0,
    topTags: [],
    topKeywords: [],
    notesByType: {},
    qualityDistribution: {},
    timelineData: []
  });
  
  // Saved searches
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  
  // Available filter options
  const noteTypes = [
    { value: 'cold-call', label: 'Cold Call', icon: '📞' },
    { value: 'follow-up', label: 'Follow-up', icon: '🔄' },
    { value: 'demo-presentation', label: 'Demo', icon: '💻' },
    { value: 'closing-call', label: 'Closing', icon: '🤝' },
    { value: 'general', label: 'General', icon: '📝' }
  ];
  
  const outcomes = [
    { value: 'connected', label: 'Connected', color: 'green' },
    { value: 'voicemail', label: 'Voicemail', color: 'blue' },
    { value: 'no_answer', label: 'No Answer', color: 'gray' },
    { value: 'interested', label: 'Interested', color: 'green' },
    { value: 'not_interested', label: 'Not Interested', color: 'red' },
    { value: 'callback_requested', label: 'Callback', color: 'yellow' },
    { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'purple' }
  ];

  // Load data on mount
  useEffect(() => {
    loadNotes();
    loadSavedSearches();
  }, [leadId]);

  // Update filtered notes when search parameters change
  useEffect(() => {
    performSearch();
  }, [notes, searchQuery, searchOptions, filters, sortBy, sortOrder]);

  // Load notes
  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = leadId 
        ? await notesService.getNotesByLead(leadId)
        : await notesService.getAllNotes();
      
      if (response.success) {
        setNotes(response.data);
        calculateAnalytics(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  // Load saved searches
  const loadSavedSearches = async () => {
    try {
      const response = await notesService.getSavedSearches();
      if (response.success) {
        setSavedSearches(response.data);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  // Calculate analytics
  const calculateAnalytics = (notesData) => {
    const analytics = {
      totalNotes: notesData.length,
      averageQuality: Math.round(
        notesData.reduce((sum, note) => sum + (note.quality || 0), 0) / notesData.length
      ),
      topTags: [],
      topKeywords: [],
      notesByType: {},
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      timelineData: []
    };

    // Calculate tag frequency
    const tagFrequency = {};
    const keywordFrequency = {};
    
    notesData.forEach(note => {
      // Count tags
      note.tags?.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
      
      // Count note types
      analytics.notesByType[note.type] = (analytics.notesByType[note.type] || 0) + 1;
      
      // Quality distribution
      const quality = note.quality || 0;
      if (quality >= 80) analytics.qualityDistribution.excellent++;
      else if (quality >= 60) analytics.qualityDistribution.good++;
      else if (quality >= 40) analytics.qualityDistribution.fair++;
      else analytics.qualityDistribution.poor++;
      
      // Extract keywords from content
      if (note.content) {
        const words = note.content.toLowerCase()
          .split(/\W+/)
          .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'their', 'said', 'each', 'which', 'will'].includes(word));
        
        words.forEach(word => {
          keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
        });
      }
    });

    // Get top tags and keywords
    analytics.topTags = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    analytics.topKeywords = Object.entries(keywordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([keyword, count]) => ({ keyword, count }));

    // Timeline data (notes per day for last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    analytics.timelineData = last30Days.map(date => ({
      date,
      count: notesData.filter(note => 
        note.createdAt && note.createdAt.startsWith(date)
      ).length
    }));

    setAnalytics(analytics);
  };

  // Perform search
  const performSearch = useCallback(() => {
    let filtered = [...notes];

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchOptions.caseSensitive ? searchQuery : searchQuery.toLowerCase();
      
      filtered = filtered.filter(note => {
        let searchText = '';
        
        if (searchOptions.includeContent) {
          searchText += searchOptions.caseSensitive ? note.content : note.content.toLowerCase();
        }
        
        if (searchOptions.includeTags) {
          searchText += ' ' + (note.tags || []).join(' ').toLowerCase();
        }
        
        if (searchOptions.includeType) {
          searchText += ' ' + note.type.toLowerCase();
        }

        if (searchMode === 'boolean' && booleanQuery.trim()) {
          return evaluateBooleanQuery(booleanQuery, searchText);
        } else if (searchOptions.useRegex) {
          try {
            const regex = new RegExp(query, searchOptions.caseSensitive ? 'g' : 'gi');
            return regex.test(searchText);
          } catch {
            return searchText.includes(query);
          }
        } else {
          return searchText.includes(query);
        }
      });
    }

    // Apply filters
    filtered = applyFilters(filtered);

    // Apply sorting
    filtered = applySorting(filtered);

    setFilteredNotes(filtered);
  }, [notes, searchQuery, searchOptions, filters, sortBy, sortOrder, searchMode, booleanQuery]);

  // Evaluate boolean search query
  const evaluateBooleanQuery = (query, text) => {
    // Simple boolean query evaluation (AND, OR, NOT)
    try {
      const processedQuery = query
        .replace(/\bAND\b/gi, ' && ')
        .replace(/\bOR\b/gi, ' || ')
        .replace(/\bNOT\b/gi, ' ! ')
        .replace(/(\w+)/g, (match) => `text.includes('${match.toLowerCase()}')`);
      
      return eval(processedQuery);
    } catch {
      return text.includes(query.toLowerCase());
    }
  };

  // Apply filters
  const applyFilters = (notesToFilter) => {
    let filtered = [...notesToFilter];

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.createdAt);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : new Date('1900-01-01');
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date();
        return noteDate >= startDate && noteDate <= endDate;
      });
    } else if (filters.dateRange.preset !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (filters.dateRange.preset) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(note => new Date(note.createdAt) >= filterDate);
    }

    // Note type filter
    if (filters.noteTypes.length > 0) {
      filtered = filtered.filter(note => filters.noteTypes.includes(note.type));
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(note => 
        filters.tags.some(tag => note.tags?.includes(tag))
      );
    }

    // Quality filter
    filtered = filtered.filter(note => {
      const quality = note.quality || 0;
      return quality >= filters.qualityRange.min && quality <= filters.qualityRange.max;
    });

    // Outcome filter
    if (filters.outcomes.length > 0) {
      filtered = filtered.filter(note => filters.outcomes.includes(note.outcome));
    }

    // Author filter
    if (filters.authors.length > 0) {
      filtered = filtered.filter(note => filters.authors.includes(note.authorId));
    }

    // Follow-up filter
    if (filters.hasFollowUp !== null) {
      filtered = filtered.filter(note => !!note.followUpRequired === filters.hasFollowUp);
    }

    // Action items filter
    if (filters.hasActionItems !== null) {
      filtered = filtered.filter(note => {
        const hasActionItems = note.content && (
          note.content.includes('TODO') ||
          note.content.includes('Action:') ||
          note.content.includes('Follow up:')
        );
        return hasActionItems === filters.hasActionItems;
      });
    }

    return filtered;
  };

  // Apply sorting
  const applySorting = (notesToSort) => {
    const sorted = [...notesToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'quality':
          comparison = (a.quality || 0) - (b.quality || 0);
          break;
        case 'relevance':
          // Simple relevance scoring based on search query matches
          if (searchQuery) {
            const aMatches = (a.content.toLowerCase().match(new RegExp(searchQuery.toLowerCase(), 'g')) || []).length;
            const bMatches = (b.content.toLowerCase().match(new RegExp(searchQuery.toLowerCase(), 'g')) || []).length;
            comparison = aMatches - bMatches;
          }
          break;
        case 'length':
          comparison = a.content.length - b.content.length;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  // Save current search
  const saveCurrentSearch = async () => {
    try {
      const searchData = {
        name: saveSearchName,
        query: searchQuery,
        filters,
        searchOptions,
        sortBy,
        sortOrder
      };

      const response = await notesService.saveSearch(searchData);
      
      if (response.success) {
        setSavedSearches(prev => [...prev, response.data]);
        setShowSaveSearch(false);
        setSaveSearchName('');
      }
    } catch (error) {
      setError('Failed to save search');
    }
  };

  // Load saved search
  const loadSavedSearch = (search) => {
    setSearchQuery(search.query);
    setFilters(search.filters);
    setSearchOptions(search.searchOptions);
    setSortBy(search.sortBy);
    setSortOrder(search.sortOrder);
  };

  // Group notes by specified criteria
  const groupedNotes = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Notes': filteredNotes };
    }

    const groups = {};
    
    filteredNotes.forEach(note => {
      let groupKey;
      
      switch (groupBy) {
        case 'date':
          groupKey = new Date(note.createdAt).toLocaleDateString();
          break;
        case 'type':
          groupKey = noteTypes.find(type => type.value === note.type)?.label || note.type;
          break;
        case 'author':
          groupKey = note.authorName || 'Unknown Author';
          break;
        case 'quality':
          const quality = note.quality || 0;
          if (quality >= 80) groupKey = 'Excellent (80-100%)';
          else if (quality >= 60) groupKey = 'Good (60-79%)';
          else if (quality >= 40) groupKey = 'Fair (40-59%)';
          else groupKey = 'Poor (0-39%)';
          break;
        default:
          groupKey = 'Ungrouped';
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(note);
    });

    return groups;
  }, [filteredNotes, groupBy]);

  // Render note card
  const renderNoteCard = (note) => (
    <div
      key={note.id}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onNoteSelect && onNoteSelect(note)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <span className="text-lg mr-2">
            {noteTypes.find(type => type.value === note.type)?.icon || '📝'}
          </span>
          <h4 className="font-medium text-gray-800">
            {noteTypes.find(type => type.value === note.type)?.label || note.type}
          </h4>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Quality indicator */}
          <div className="flex items-center">
            <div className="w-16 h-2 bg-gray-200 rounded">
              <div 
                className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded"
                style={{ width: `${note.quality || 0}%` }}
              ></div>
            </div>
            <span className="ml-1 text-xs text-gray-500">{note.quality || 0}%</span>
          </div>
          
          {/* Follow-up indicator */}
          {note.followUpRequired && (
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
              📅 Follow-up
            </span>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
        {note.content.substring(0, 150)}...
      </p>
      
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-1">
          {note.tags?.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
            >
              {tag}
            </span>
          ))}
          {note.tags?.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {new Date(note.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="note-search-interface h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">🔍 Note Search & Analytics</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search bar */}
        <div className="flex space-x-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes... (try: pain points, decision maker, budget)"
              className="w-full p-3 border rounded-lg text-sm"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort);
                setSortOrder(order);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="quality-desc">Highest Quality</option>
              <option value="quality-asc">Lowest Quality</option>
              <option value="relevance-desc">Most Relevant</option>
              <option value="length-desc">Longest</option>
              <option value="length-asc">Shortest</option>
            </select>
            
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="none">No Grouping</option>
              <option value="date">Group by Date</option>
              <option value="type">Group by Type</option>
              <option value="quality">Group by Quality</option>
            </select>
          </div>
        </div>

        {/* Search options and filters */}
        <div className="flex flex-wrap gap-4 text-sm">
          {/* Search mode */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSearchMode('simple')}
              className={`px-3 py-1 rounded ${
                searchMode === 'simple' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setSearchMode('advanced')}
              className={`px-3 py-1 rounded ${
                searchMode === 'advanced' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Advanced
            </button>
            <button
              onClick={() => setSearchMode('boolean')}
              className={`px-3 py-1 rounded ${
                searchMode === 'boolean' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Boolean
            </button>
          </div>

          {/* Quick filters */}
          <div className="flex space-x-2">
            <select
              value={filters.dateRange.preset}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, preset: e.target.value }
              }))}
              className="px-2 py-1 border rounded"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            
            <div className="flex items-center space-x-2">
              <span>Quality:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.qualityRange.min}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  qualityRange: { ...prev.qualityRange, min: parseInt(e.target.value) }
                }))}
                className="w-16"
              />
              <span className="text-xs">{filters.qualityRange.min}%+</span>
            </div>
          </div>

          {/* Saved searches */}
          <div className="flex space-x-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const search = savedSearches.find(s => s.id === e.target.value);
                  if (search) loadSavedSearch(search);
                  e.target.value = '';
                }
              }}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="">Saved Searches...</option>
              {savedSearches.map(search => (
                <option key={search.id} value={search.id}>
                  {search.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setShowSaveSearch(true)}
              className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
            >
              💾 Save
            </button>
          </div>
        </div>
      </div>

      {/* Results section */}
      <div className="flex-1 flex">
        {/* Main results */}
        <div className="flex-1 p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="ml-2">Searching notes...</span>
            </div>
          ) : (
            <>
              {/* Results summary */}
              <div className="mb-4 p-3 bg-white rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Found {filteredNotes.length} of {notes.length} notes
                  </span>
                  <span className="text-sm text-gray-600">
                    Average quality: {Math.round(
                      filteredNotes.reduce((sum, note) => sum + (note.quality || 0), 0) / 
                      (filteredNotes.length || 1)
                    )}%
                  </span>
                </div>
              </div>

              {/* Results */}
              {Object.entries(groupedNotes).map(([groupName, groupNotes]) => (
                <div key={groupName} className="mb-6">
                  {groupBy !== 'none' && (
                    <h3 className="text-lg font-medium text-gray-700 mb-3 flex items-center">
                      {groupName}
                      <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                        {groupNotes.length}
                      </span>
                    </h3>
                  )}
                  
                  <div className={`grid gap-4 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                      : 'grid-cols-1'
                  }`}>
                    {groupNotes.map(renderNoteCard)}
                  </div>
                </div>
              ))}

              {filteredNotes.length === 0 && !loading && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🔍</div>
                  <div className="text-gray-600 mb-2">No notes found</div>
                  <div className="text-sm text-gray-500">
                    Try adjusting your search criteria or filters
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Analytics sidebar */}
        <div className="w-80 bg-white border-l p-4 overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-700 mb-4">📊 Analytics</h3>
          
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.totalNotes}</div>
              <div className="text-xs text-blue-600">Total Notes</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.averageQuality}%</div>
              <div className="text-xs text-green-600">Avg Quality</div>
            </div>
          </div>

          {/* Top tags */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-2">🏷️ Top Tags</h4>
            <div className="space-y-1">
              {analytics.topTags.slice(0, 8).map(({ tag, count }) => (
                <div key={tag} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{tag}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top keywords */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-2">🔤 Top Keywords</h4>
            <div className="flex flex-wrap gap-1">
              {analytics.topKeywords.slice(0, 12).map(({ keyword, count }) => (
                <span
                  key={keyword}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded cursor-pointer hover:bg-gray-200"
                  onClick={() => setSearchQuery(keyword)}
                  title={`${count} occurrences`}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {/* Notes by type */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-2">📝 Notes by Type</h4>
            <div className="space-y-2">
              {Object.entries(analytics.notesByType).map(([type, count]) => {
                const typeInfo = noteTypes.find(t => t.value === type);
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <span className="mr-1">{typeInfo?.icon || '📝'}</span>
                      {typeInfo?.label || type}
                    </span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quality distribution */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">⭐ Quality Distribution</h4>
            <div className="space-y-2">
              {Object.entries(analytics.qualityDistribution).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{level}</span>
                  <div className="flex items-center">
                    <div className="w-16 h-2 bg-gray-200 rounded mr-2">
                      <div 
                        className="h-full bg-blue-400 rounded"
                        style={{ 
                          width: `${(count / analytics.totalNotes) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-gray-500">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save search modal */}
      {showSaveSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">💾 Save Search</h3>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Search name..."
              className="w-full p-3 border rounded-lg mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveSearch(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentSearch}
                disabled={!saveSearchName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteSearchInterface;