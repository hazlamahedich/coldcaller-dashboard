import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const LlmConfiguration = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const [configurations, setConfigurations] = useState([]);
  const [providers, setProviders] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState({});

  const [formData, setFormData] = useState({
    provider: 'google-gemini',
    model: 'gemini-1.5-flash',
    apiKey: '',
    maxTokens: 4000,
    temperature: 0.1,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: '',
    rateLimitPerMinute: 60,
    rateLimitPerDay: 1000,
    monthlyBudget: 100.00,
    alertThreshold: 80,
    useCases: ['data_parsing', 'lead_scoring', 'chat_assistance'],
    isActive: true
  });

  useEffect(() => {
    loadConfigurations();
    loadProviders();
  }, []);

  const loadConfigurations = async () => {
    try {
      const data = await api.get('/llm/configurations');
      if (data.success) {
        setConfigurations(data.data);
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await api.get('/llm/providers');
      if (data.success) {
        setProviders(data.data.providers);
      } else {
        // Set default providers if API fails
        setProviders([
          {
            id: 'google-gemini',
            name: 'Google Gemini',
            models: [
              { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
              { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
            ]
          },
          {
            id: 'openai',
            name: 'OpenAI',
            models: [
              { id: 'whisper-1', name: 'Whisper' },
              { id: 'gpt-4o', name: 'GPT-4o' }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      // Set default providers on error
      setProviders([
        {
          id: 'google-gemini',
          name: 'Google Gemini',
          models: [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
          ]
        },
        {
          id: 'openai',
          name: 'OpenAI',
          models: [
            { id: 'whisper-1', name: 'Whisper' },
            { id: 'gpt-4o', name: 'GPT-4o' }
          ]
        }
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let data;
      if (activeConfig) {
        data = await api.put(`/llm/configurations/${activeConfig.id}`, formData);
      } else {
        data = await api.post('/llm/configurations', formData);
      }
      
      if (data.success) {
        await loadConfigurations();
        setIsEditing(false);
        setActiveConfig(null);
        resetForm();
        alert('Configuration saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config) => {
    setActiveConfig(config);
    setFormData({
      provider: config.provider,
      model: config.model,
      apiKey: '', // Don't pre-populate for security
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      systemPrompt: config.systemPrompt || '',
      rateLimitPerMinute: config.rateLimitPerMinute,
      rateLimitPerDay: config.rateLimitPerDay,
      monthlyBudget: config.monthlyBudget,
      alertThreshold: config.alertThreshold,
      useCases: config.useCases || [],
      isActive: config.isActive
    });
    setIsEditing(true);
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const data = await api.delete(`/llm/configurations/${configId}`);
      if (data.success) {
        await loadConfigurations();
        alert('Configuration deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      alert('Failed to delete configuration: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleTest = async (configId) => {
    try {
      setTestResults(prev => ({ ...prev, [configId]: { loading: true } }));
      
      const data = await api.post(`/llm/configurations/${configId}/test`);
      
      setTestResults(prev => ({
        ...prev,
        [configId]: {
          loading: false,
          success: data.success,
          data: data.data,
          error: data.error
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [configId]: {
          loading: false,
          success: false,
          error: error.response?.data?.error || error.message
        }
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'google-gemini',
      model: 'gemini-1.5-flash',
      apiKey: '',
      maxTokens: 4000,
      temperature: 0.1,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: '',
      rateLimitPerMinute: 60,
      rateLimitPerDay: 1000,
      monthlyBudget: 100.00,
      alertThreshold: 80,
      useCases: ['data_parsing', 'lead_scoring', 'chat_assistance'],
      isActive: true
    });
  };

  const getAvailableModels = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.models || [];
  };

  const getDefaultUseCases = (provider, model) => {
    // Define model-specific use cases for task-based routing
    const modelUseCases = {
      'whisper-1': ['transcription', 'call_transcription', 'audio_processing'],
      'whisper-large': ['transcription', 'call_transcription', 'audio_processing'],
      'gpt-4o': ['data_parsing', 'lead_scoring', 'chat_assistance', 'content_generation'],
      'gpt-4o-mini': ['data_parsing', 'lead_scoring', 'chat_assistance'],
      'gpt-3.5-turbo': ['chat_assistance', 'simple_parsing'],
      'gemini-1.5-flash': ['data_parsing', 'lead_scoring', 'chat_assistance'],
      'gemini-1.5-pro': ['data_parsing', 'lead_scoring', 'chat_assistance', 'complex_analysis'],
      'claude-3-5-sonnet-20241022': ['data_parsing', 'lead_scoring', 'content_generation', 'analysis'],
      'claude-3-haiku-20240307': ['data_parsing', 'chat_assistance']
    };

    return modelUseCases[model] || ['data_parsing', 'lead_scoring', 'chat_assistance'];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
            LLM Configuration
          </h2>
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
            Configure AI providers, models, and usage parameters
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
            isEditing ? 'bg-gray-600 hover:bg-gray-700' : ''
          }`}
        >
          {isEditing ? 'Cancel' : 'Add Configuration'}
        </button>
      </div>

      {/* Configuration Form */}
      {isEditing && (
        <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}>
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>
            {activeConfig ? 'Edit Configuration' : 'Add New Configuration'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider and Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    const newModel = getAvailableModels(newProvider)[0]?.id || '';
                    setFormData({ 
                      ...formData, 
                      provider: newProvider,
                      model: newModel,
                      useCases: getDefaultUseCases(newProvider, newModel)
                    });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                >
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setFormData({ 
                      ...formData, 
                      model: newModel,
                      useCases: getDefaultUseCases(formData.provider, newModel)
                    });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                >
                  {getAvailableModels(formData.provider).map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter your API key"
                required={!activeConfig}
              />
              {activeConfig && (
                <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                  Leave empty to keep existing API key
                </p>
              )}
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="100"
                  max="32000"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Top P
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.topP}
                  onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Rate Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Rate Limit (per minute)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.rateLimitPerMinute}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Rate Limit (per day)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.rateLimitPerDay}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerDay: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Budget Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Monthly Budget ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyBudget}
                  onChange={(e) => setFormData({ ...formData, monthlyBudget: parseFloat(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Use Cases Display */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                Assigned Use Cases
              </label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                {formData.useCases.map((useCase, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-sm font-medium"
                  >
                    {useCase.replace('_', ' ')}
                  </span>
                ))}
              </div>
              <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                Use cases are automatically assigned based on the selected model's capabilities
              </p>
            </div>

            {/* System Prompt */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                System Prompt (Optional)
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter a system prompt to guide the AI's behavior..."
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className={`ml-2 text-sm ${themeClasses.textPrimary}`}>
                Enable this configuration
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setActiveConfig(null);
                  resetForm();
                }}
                className={`px-4 py-2 border rounded-lg ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : activeConfig ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Configurations List */}
      <div className="grid grid-cols-1 gap-4">
        {configurations.map((config) => (
          <div
            key={config.id}
            className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
                    {providers.find(p => p.id === config.provider)?.name || config.provider}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    config.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className={`font-medium ${themeClasses.textSecondary}`}>Model:</span>
                    <p className={themeClasses.textPrimary}>{config.model}</p>
                  </div>
                  <div>
                    <span className={`font-medium ${themeClasses.textSecondary}`}>Max Tokens:</span>
                    <p className={themeClasses.textPrimary}>{config.maxTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className={`font-medium ${themeClasses.textSecondary}`}>Temperature:</span>
                    <p className={themeClasses.textPrimary}>{config.temperature}</p>
                  </div>
                  <div>
                    <span className={`font-medium ${themeClasses.textSecondary}`}>Budget:</span>
                    <p className={themeClasses.textPrimary}>${config.monthlyBudget}/month</p>
                  </div>
                </div>

                {config.useCases && config.useCases.length > 0 && (
                  <div className="mt-3">
                    <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>Use Cases:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {config.useCases.map((useCase, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs"
                        >
                          {useCase.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Results */}
                {testResults[config.id] && (
                  <div className="mt-3">
                    {testResults[config.id].loading && (
                      <div className="text-sm text-blue-600">Testing configuration...</div>
                    )}
                    {testResults[config.id].success && (
                      <div className="text-sm text-green-600">✓ Configuration test passed</div>
                    )}
                    {testResults[config.id].error && (
                      <div className="text-sm text-red-600">✗ Test failed: {testResults[config.id].error}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleTest(config.id)}
                  disabled={testResults[config.id]?.loading}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  onClick={() => handleEdit(config)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {configurations.length === 0 && (
          <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-8 text-center`}>
            <div className="text-6xl mb-4">🤖</div>
            <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>
              No LLM Configurations
            </h3>
            <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
              Add your first AI provider configuration to get started with intelligent features.
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Configuration
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LlmConfiguration;