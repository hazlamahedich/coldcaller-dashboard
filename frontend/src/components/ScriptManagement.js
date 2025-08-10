import React, { useState, useEffect } from 'react';
import { scriptsService } from '../services';
import { useTheme } from '../contexts/ThemeContext';

const ScriptManagement = ({ isOpen, onClose, onScriptChange }) => {
  const { isDarkMode, themeClasses } = useTheme();
  
  // Modal state
  const [activeTab, setActiveTab] = useState('create');
  const [scripts, setScripts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    text: '',
    color: 'blue',
    category: 'general'
  });
  const [selectedScriptForEdit, setSelectedScriptForEdit] = useState(null);
  const [selectedScriptForDelete, setSelectedScriptForDelete] = useState(null);

  // Load scripts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadScripts();
    }
  }, [isOpen]);

  // Reset form when tab changes
  useEffect(() => {
    if (activeTab === 'create') {
      setFormData({
        id: '',
        title: '',
        text: '',
        color: 'blue',
        category: 'general'
      });
      setSelectedScriptForEdit(null);
    }
  }, [activeTab]);

  const loadScripts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await scriptsService.getAllScripts();
      
      if (response.success) {
        // Convert array to object if needed
        const scriptsData = Array.isArray(response.data) 
          ? response.data.reduce((acc, script) => ({ ...acc, [script.id]: script }), {})
          : response.data;
        setScripts(scriptsData);
      } else {
        setError('Failed to load scripts');
      }
    } catch (err) {
      console.error('Failed to load scripts:', err);
      setError('Failed to load scripts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateScript = async (e) => {
    e.preventDefault();
    
    if (!formData.id || !formData.title || !formData.text) {
      setError('ID, title, and text are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await scriptsService.createScript(formData);
      
      if (response.success) {
        await loadScripts();
        onScriptChange && onScriptChange();
        
        // Reset form
        setFormData({
          id: '',
          title: '',
          text: '',
          color: 'blue',
          category: 'general'
        });
        
        showNotification('Script created successfully!', 'success');
      } else {
        setError(response.message || 'Failed to create script');
      }
    } catch (err) {
      console.error('Failed to create script:', err);
      setError('Failed to create script');
    } finally {
      setLoading(false);
    }
  };

  const handleEditScript = async (e) => {
    e.preventDefault();
    
    if (!selectedScriptForEdit || !formData.title || !formData.text) {
      setError('Title and text are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const updates = {
        title: formData.title,
        text: formData.text,
        color: formData.color,
        category: formData.category
      };
      
      const response = await scriptsService.updateScript(selectedScriptForEdit, updates);
      
      if (response.success) {
        await loadScripts();
        onScriptChange && onScriptChange();
        
        setSelectedScriptForEdit(null);
        setFormData({
          id: '',
          title: '',
          text: '',
          color: 'blue',
          category: 'general'
        });
        
        showNotification('Script updated successfully!', 'success');
      } else {
        setError(response.message || 'Failed to update script');
      }
    } catch (err) {
      console.error('Failed to update script:', err);
      setError('Failed to update script');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScript = async (scriptId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await scriptsService.deleteScript(scriptId);
      
      if (response.success) {
        await loadScripts();
        onScriptChange && onScriptChange();
        setSelectedScriptForDelete(null);
        
        showNotification('Script deleted successfully!', 'success');
      } else {
        setError(response.message || 'Failed to delete script');
      }
    } catch (err) {
      console.error('Failed to delete script:', err);
      setError('Failed to delete script');
    } finally {
      setLoading(false);
    }
  };

  const startEditScript = (scriptId) => {
    const script = scripts[scriptId];
    if (script) {
      setFormData({
        id: script.id,
        title: script.title,
        text: script.text,
        color: script.color || 'blue',
        category: script.category || 'general'
      });
      setSelectedScriptForEdit(scriptId);
      setActiveTab('edit');
    }
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg z-50`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  if (!isOpen) return null;

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`
        max-w-4xl w-full max-h-[90vh] rounded-lg shadow-xl overflow-hidden
        ${themeClasses.cardBg} ${themeClasses.border} border
      `}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
          <div className="flex justify-between items-center">
            <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
              ⚙️ Script Management
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`border-b ${themeClasses.border}`}>
          <div className="flex">
            {[
              { id: 'create', label: '➕ Create', icon: '➕' },
              { id: 'edit', label: '✏️ Edit', icon: '✏️' },
              { id: 'manage', label: '📋 Manage', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-3 font-medium text-sm transition-colors border-b-2
                  ${activeTab === tab.id
                    ? `border-blue-500 ${isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-50'}`
                    : `border-transparent ${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className={`mb-4 p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-800 text-red-400'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              ⚠️ {error}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateScript} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                    Script ID *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    placeholder="e.g., my_custom_script"
                    className={`w-full px-3 py-2 rounded-md border ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    required
                  />
                  <p className={`text-xs mt-1 ${themeClasses.textSecondary}`}>
                    Letters, numbers, underscores, and hyphens only
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Custom Introduction"
                    className={`w-full px-3 py-2 rounded-md border ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                    Color Theme
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    {colorOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="e.g., introduction, objection, closing"
                    className={`w-full px-3 py-2 rounded-md border ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                  Script Text *
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => handleInputChange('text', e.target.value)}
                  placeholder="Enter your script content here. Use [NAME], [COMPANY], [YOUR NAME] for personalization..."
                  rows={8}
                  className={`w-full px-3 py-2 rounded-md border ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-serif`}
                  required
                />
                <p className={`text-xs mt-1 ${themeClasses.textSecondary}`}>
                  Use placeholders like [NAME], [COMPANY], [YOUR NAME] for personalization
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } transition-colors`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Creating...' : '➕ Create Script'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'edit' && (
            <div>
              {!selectedScriptForEdit ? (
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
                    Select a script to edit:
                  </h3>
                  {loading ? (
                    <div className={`text-center py-8 ${themeClasses.textSecondary}`}>
                      🔄 Loading scripts...
                    </div>
                  ) : Object.keys(scripts).length === 0 ? (
                    <div className={`text-center py-8 ${themeClasses.textSecondary}`}>
                      📝 No scripts available
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.values(scripts).map(script => (
                        <button
                          key={script.id}
                          onClick={() => startEditScript(script.id)}
                          className={`
                            p-4 rounded-lg border text-left transition-all hover:shadow-md
                            ${isDarkMode
                              ? 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full bg-${script.color}-500`}></div>
                            <h4 className={`font-medium ${themeClasses.textPrimary}`}>
                              {script.title}
                            </h4>
                          </div>
                          <p className={`text-sm ${themeClasses.textSecondary} truncate`}>
                            {script.text.substring(0, 100)}...
                          </p>
                          <div className={`text-xs mt-2 ${themeClasses.textSecondary}`}>
                            Category: {script.category || 'general'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEditScript} className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedScriptForEdit(null)}
                      className={`p-2 rounded-full ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      } transition-colors`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
                      Editing: {scripts[selectedScriptForEdit]?.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className={`w-full px-3 py-2 rounded-md border ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        required
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                        Color Theme
                      </label>
                      <select
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className={`w-full px-3 py-2 rounded-md border ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      >
                        {colorOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className={`w-full px-3 py-2 rounded-md border ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${themeClasses.textPrimary}`}>
                      Script Text *
                    </label>
                    <textarea
                      value={formData.text}
                      onChange={(e) => handleInputChange('text', e.target.value)}
                      rows={8}
                      className={`w-full px-3 py-2 rounded-md border ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-serif`}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedScriptForEdit(null)}
                      className={`px-4 py-2 rounded-md font-medium ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      } transition-colors`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '⏳ Updating...' : '✏️ Update Script'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
                  Manage Scripts ({Object.keys(scripts).length})
                </h3>
                <button
                  onClick={loadScripts}
                  disabled={loading}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } transition-colors disabled:opacity-50`}
                >
                  {loading ? '🔄 Loading...' : '🔄 Refresh'}
                </button>
              </div>

              {loading ? (
                <div className={`text-center py-8 ${themeClasses.textSecondary}`}>
                  🔄 Loading scripts...
                </div>
              ) : Object.keys(scripts).length === 0 ? (
                <div className={`text-center py-8 ${themeClasses.textSecondary}`}>
                  📝 No scripts available
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.values(scripts).map(script => (
                    <div
                      key={script.id}
                      className={`
                        p-4 rounded-lg border
                        ${isDarkMode
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-white border-gray-200'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full bg-${script.color}-500`}></div>
                            <h4 className={`font-medium ${themeClasses.textPrimary}`}>
                              {script.title}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {script.category || 'general'}
                            </span>
                          </div>
                          <p className={`text-sm ${themeClasses.textSecondary} mb-2`}>
                            ID: {script.id}
                          </p>
                          <p className={`text-sm ${themeClasses.textSecondary}`}>
                            {script.text.substring(0, 150)}...
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEditScript(script.id)}
                            className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Edit script"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setSelectedScriptForDelete(script.id)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete script"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {selectedScriptForDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
            <div className={`
              max-w-md w-full rounded-lg shadow-xl p-6
              ${themeClasses.cardBg} ${themeClasses.border} border
            `}>
              <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>
                🗑️ Delete Script
              </h3>
              <p className={`mb-6 ${themeClasses.textSecondary}`}>
                Are you sure you want to delete "<strong>{scripts[selectedScriptForDelete]?.title}</strong>"? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedScriptForDelete(null)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteScript(selectedScriptForDelete)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptManagement;