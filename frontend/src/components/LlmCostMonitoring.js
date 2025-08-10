import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const LlmCostMonitoring = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const [usage, setUsage] = useState([]);
  const [stats, setStats] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState('');

  const [newBudget, setNewBudget] = useState({
    name: '',
    budgetType: 'monthly',
    amount: 100,
    providers: [],
    useCases: []
  });
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  useEffect(() => {
    loadUsageStats();
    loadBudgets();
    loadCostAnalysis();
  }, [period, selectedProvider, selectedUseCase]);

  const loadUsageStats = async () => {
    try {
      const params = new URLSearchParams({
        period,
        ...(selectedProvider && { provider: selectedProvider }),
        ...(selectedUseCase && { useCase: selectedUseCase })
      });

      const data = await api.get(`/llm/usage/stats?${params}`);
      
      if (data.success) {
        setStats(data.data);
      } else {
        // Set empty stats if no data or error
        setStats({
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          successRate: 0
        });
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      // Set empty stats on error to stop loading state
      setStats({
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        successRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(selectedProvider && { provider: selectedProvider }),
        ...(selectedUseCase && { useCase: selectedUseCase })
      });

      const data = await api.get(`/llm/usage?${params}`);
      
      if (data.success) {
        if (page === 1) {
          setUsage(data.data.usage);
        } else {
          setUsage(prev => [...prev, ...data.data.usage]);
        }
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgets = async () => {
    try {
      const data = await api.get('/llm/budgets');
      
      if (data.success) {
        setBudgets(data.data);
      } else {
        setBudgets([]);
      }
    } catch (error) {
      console.error('Failed to load budgets:', error);
      setBudgets([]);
    }
  };

  const loadCostAnalysis = async () => {
    try {
      const params = new URLSearchParams({ period });
      const data = await api.get(`/llm/cost-analysis?${params}`);
      
      if (data.success) {
        setCostAnalysis(data.data);
      } else {
        setCostAnalysis(null);
      }
    } catch (error) {
      console.error('Failed to load cost analysis:', error);
      setCostAnalysis(null);
    }
  };

  const createBudget = async (e) => {
    e.preventDefault();
    
    try {
      const data = await api.post('/llm/budgets', newBudget);
      
      if (data.success) {
        await loadBudgets();
        setNewBudget({
          name: '',
          budgetType: 'monthly',
          amount: 100,
          providers: [],
          useCases: []
        });
        setShowBudgetForm(false);
        alert('Budget created successfully!');
      }
    } catch (error) {
      console.error('Failed to create budget:', error);
      alert('Failed to create budget: ' + (error.response?.data?.error || error.message));
    }
  };

  const deleteBudget = async (budgetId) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) {
      return;
    }

    try {
      const data = await api.delete(`/llm/budgets/${budgetId}`);
      if (data.success) {
        await loadBudgets();
        alert('Budget deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget: ' + (error.response?.data?.error || error.message));
    }
  };

  const formatCost = (cost) => {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(3)}k`; // Show in milli-dollars
    }
    return `$${cost.toFixed(4)}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toLocaleString() || '0';
  };

  const getBudgetStatus = (budget) => {
    const percentage = budget.percentageUsed;
    if (percentage >= 100) return { color: 'red', label: 'Exceeded' };
    if (percentage >= 90) return { color: 'orange', label: 'Critical' };
    if (percentage >= 75) return { color: 'yellow', label: 'Warning' };
    return { color: 'green', label: 'Good' };
  };

  if (loading && !stats) {
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
            LLM Cost Monitoring
          </h2>
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
            Track AI usage, costs, and manage budgets
          </p>
        </div>

        {/* Period and Filter Controls */}
        <div className="flex space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={`px-3 py-2 border rounded-lg ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className={`px-3 py-2 border rounded-lg ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Providers</option>
            <option value="google-gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Total Requests</p>
                <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                  {formatNumber(stats.totalRequests)}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
            </div>
          </div>

          <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Total Tokens</p>
                <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                  {formatNumber(stats.totalTokens)}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🔤</span>
              </div>
            </div>
          </div>

          <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Total Cost</p>
                <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                  {formatCost(stats.totalCost)}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💰</span>
              </div>
            </div>
          </div>

          <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Success Rate</p>
                <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                  {stats.successRate?.toFixed(1)}%
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">✅</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Management */}
      <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Budget Management</h3>
          <button
            onClick={() => setShowBudgetForm(!showBudgetForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showBudgetForm ? 'Cancel' : 'Add Budget'}
          </button>
        </div>

        {showBudgetForm && (
          <form onSubmit={createBudget} className="mb-6 p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Budget name"
                value={newBudget.name}
                onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                className={`px-3 py-2 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />

              <select
                value={newBudget.budgetType}
                onChange={(e) => setNewBudget({ ...newBudget, budgetType: e.target.value })}
                className={`px-3 py-2 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="total">Total</option>
              </select>

              <input
                type="number"
                placeholder="Amount ($)"
                min="0"
                step="0.01"
                value={newBudget.amount}
                onChange={(e) => setNewBudget({ ...newBudget, amount: parseFloat(e.target.value) })}
                className={`px-3 py-2 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create Budget
            </button>
          </form>
        )}

        <div className="space-y-3">
          {budgets.map((budget) => {
            const status = getBudgetStatus(budget);
            return (
              <div key={budget.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className={`font-medium ${themeClasses.textPrimary}`}>{budget.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      status.color === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                      status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    }`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className={themeClasses.textSecondary}>
                      {budget.budgetType} • ${budget.spent?.toFixed(2)} / ${budget.amount}
                    </span>
                    <span className={themeClasses.textSecondary}>
                      {budget.percentageUsed}% used
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className={`h-2 rounded-full ${
                          status.color === 'red' ? 'bg-red-500' :
                          status.color === 'orange' ? 'bg-orange-500' :
                          status.color === 'yellow' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteBudget(budget.id)}
                  className="ml-4 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            );
          })}

          {budgets.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">💰</div>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                No budgets configured. Add a budget to track spending limits.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Usage */}
      <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} p-6`}>
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Recent Usage</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.textSecondary} uppercase tracking-wider`}>
                  Time
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.textSecondary} uppercase tracking-wider`}>
                  Provider
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.textSecondary} uppercase tracking-wider`}>
                  Use Case
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.textSecondary} uppercase tracking-wider`}>
                  Tokens
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.textSecondary} uppercase tracking-wider`}>
                  Cost
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.textSecondary} uppercase tracking-wider`}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {usage.slice(0, 10).map((item) => (
                <tr key={item.id}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.textPrimary}`}>
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.textPrimary}`}>
                    {item.provider}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.textPrimary}`}>
                    {item.useCase?.replace('_', ' ')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.textPrimary}`}>
                    {formatNumber(item.totalTokens)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.textPrimary}`}>
                    {formatCost(item.totalCost)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap`}>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.success 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {item.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {usage.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📈</div>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              No usage data available for the selected filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LlmCostMonitoring;