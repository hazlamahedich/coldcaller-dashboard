import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Eye,
  Play,
  Clock,
  Users,
  Download,
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const BatchLeadUpload = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, uploaded, analyzing, analyzed, processing, completed, error
  const [analysis, setAnalysis] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [batches, setBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadSettings, setUploadSettings] = useState({
    skipDuplicates: true,
    updateExisting: false,
    enableAIScoring: true
  });
  const [pollingInterval, setPollingInterval] = useState(null);
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploadedFile(file);
    setUploadStatus('uploading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/batch/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setBatchId(data.batchId);
        setAnalysis(data.analysis);
        setUploadStatus('analyzed');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const loadPreview = async () => {
    if (!batchId) return;

    try {
      const response = await fetch(`/api/batch/${batchId}/preview`);
      const data = await response.json();

      if (response.ok) {
        setPreview(data);
      } else {
        throw new Error(data.message || 'Failed to load preview');
      }
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  const startProcessing = async () => {
    if (!batchId) return;

    setUploadStatus('processing');

    try {
      const response = await fetch(`/api/batch/${batchId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadSettings),
      });

      const data = await response.json();

      if (response.ok) {
        // Start polling for status
        const interval = setInterval(() => pollProcessingStatus(), 2000);
        setPollingInterval(interval);
      } else {
        throw new Error(data.message || 'Failed to start processing');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setUploadStatus('error');
    }
  };

  const pollProcessingStatus = async () => {
    if (!batchId) return;

    try {
      const response = await fetch(`/api/batch/${batchId}/status`);
      const data = await response.json();

      if (response.ok) {
        setProcessingStatus(data);

        if (data.status === 'completed') {
          setUploadStatus('completed');
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          loadBatches(); // Refresh batch list
        } else if (data.status === 'failed') {
          setUploadStatus('error');
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      }
    } catch (error) {
      console.error('Status polling error:', error);
    }
  };

  const loadBatches = async () => {
    try {
      const response = await fetch('/api/batch');
      const data = await response.json();

      if (response.ok) {
        setBatches(data.batches);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
    }
  };

  const deleteBatch = async (batchId) => {
    try {
      const response = await fetch(`/api/batch/${batchId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadBatches(); // Refresh list
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setUploadStatus('idle');
    setAnalysis(null);
    setBatchId(null);
    setPreview(null);
    setProcessingStatus(null);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load batches on component mount and cleanup on unmount
  React.useEffect(() => {
    loadBatches();
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
      case 'analyzing':
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'analyzed':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Upload className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'uploading': return 'Uploading file...';
      case 'analyzing': return 'Analyzing data format...';
      case 'analyzed': return 'File analyzed successfully';
      case 'processing': return 'Processing leads...';
      case 'completed': return 'Processing completed';
      case 'error': return 'An error occurred';
      default: return 'Ready to upload';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className={`${themeClasses.cardBg} rounded-lg shadow-sm border ${themeClasses.border}`}>
        <div className={`border-b ${themeClasses.border}`}>
          <nav className="flex space-x-8 px-6 pt-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`
              }`}
            >
              <Upload className="h-4 w-4 mr-2 inline" />
              Upload & Process
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`
              }`}
            >
              <Clock className="h-4 w-4 mr-2 inline" />
              Batch History
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'upload' ? (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                  Intelligent Batch Lead Import
                </h2>
                <p className={`mt-2 ${themeClasses.textSecondary}`}>
                  Upload lead data in any format (CSV, JSON, TXT, Excel) and let our AI intelligently parse and structure the information.
                </p>
              </div>

              {/* AI Scoring Settings */}
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
                <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-3`}>
                  <Brain className="h-5 w-5 inline mr-2 text-blue-500" />
                  AI Enhancement Settings
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className={`font-medium ${themeClasses.textPrimary}`}>AI Lead Scoring</p>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          Enhance leads with AI-powered scoring and insights
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadSettings.enableAIScoring}
                        onChange={(e) => setUploadSettings(prev => ({
                          ...prev,
                          enableAIScoring: e.target.checked
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-4 w-4 text-green-500" />
                      <div>
                        <p className={`font-medium ${themeClasses.textPrimary}`}>Update Existing Leads</p>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          Update existing leads with new information
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadSettings.updateExisting}
                        onChange={(e) => setUploadSettings(prev => ({
                          ...prev,
                          updateExisting: e.target.checked
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className={`font-medium ${themeClasses.textPrimary}`}>Skip Duplicates</p>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          Skip leads that already exist in the system
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadSettings.skipDuplicates}
                        onChange={(e) => setUploadSettings(prev => ({
                          ...prev,
                          skipDuplicates: e.target.checked
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {uploadSettings.enableAIScoring && (
                  <div className={`mt-4 p-3 rounded-md ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border border-blue-200`}>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                        AI Enhancement Active
                      </p>
                    </div>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      Leads will be analyzed for buying signals, risk factors, and personalized outreach suggestions
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Area */}
              {uploadStatus === 'idle' && (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : `${themeClasses.border} hover:border-gray-400`
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className={`mx-auto h-12 w-12 ${themeClasses.textSecondary}`} />
                  <div className="mt-4">
                    <p className={`text-lg font-medium ${themeClasses.textPrimary}`}>
                      Drop your file here or click to browse
                    </p>
                    <p className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
                      Supports CSV, JSON, TXT, Excel, and XML formats
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.json,.txt,.xls,.xlsx,.xml"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              )}

              {/* Upload Progress & Results */}
              {uploadStatus !== 'idle' && (
                <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(uploadStatus)}
                      <div>
                        <p className={`font-medium ${themeClasses.textPrimary}`}>
                          {uploadedFile?.name}
                        </p>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          {getStatusText(uploadStatus)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetUpload}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Analysis Results */}
                  {analysis && (
                    <div className="bg-white rounded-md p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        File Analysis
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Format</p>
                          <p className="font-medium capitalize">{analysis.format}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Estimated Records</p>
                          <p className="font-medium">{analysis.estimatedRecords}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Data Quality</p>
                          <p className="font-medium capitalize">{analysis.quality}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fields Detected</p>
                          <p className="font-medium">{analysis.fields?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Processing Status */}
                  {processingStatus && (
                    <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-md p-4 mb-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-medium ${themeClasses.textPrimary}`}>Processing Progress</h4>
                        <span className={`text-sm ${themeClasses.textSecondary}`}>
                          {processingStatus.progress}% complete
                        </span>
                      </div>
                      <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${processingStatus.progress}%` }}
                        ></div>
                      </div>

                      {/* AI Scoring Progress */}
                      {uploadSettings.enableAIScoring && processingStatus.aiScoringProgress !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Brain className="h-4 w-4 text-purple-500" />
                              <h4 className={`text-sm font-medium ${themeClasses.textPrimary}`}>AI Scoring Progress</h4>
                            </div>
                            <span className={`text-xs ${themeClasses.textSecondary}`}>
                              {processingStatus.aiScoringProgress || 0}% analyzed
                            </span>
                          </div>
                          <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-1.5`}>
                            <div
                              className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${processingStatus.aiScoringProgress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className={themeClasses.textSecondary}>Processed</p>
                          <p className={`font-medium ${themeClasses.textPrimary}`}>{processingStatus.processedCount}</p>
                        </div>
                        <div>
                          <p className={themeClasses.textSecondary}>Errors</p>
                          <p className="font-medium text-red-600">
                            {processingStatus.errors?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className={themeClasses.textSecondary}>Duplicates</p>
                          <p className="font-medium text-yellow-600">
                            {processingStatus.duplicates?.length || 0}
                          </p>
                        </div>
                      </div>

                      {/* AI Scoring Summary */}
                      {uploadSettings.enableAIScoring && processingStatus.aiScoring && (
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2 mb-2">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            <h4 className={`text-sm font-medium ${themeClasses.textPrimary}`}>AI Analysis Summary</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className={themeClasses.textSecondary}>High-Quality Leads</p>
                              <p className={`font-medium text-green-600`}>
                                {processingStatus.aiScoring.highQualityLeads || 0}
                              </p>
                            </div>
                            <div>
                              <p className={themeClasses.textSecondary}>Avg Score Boost</p>
                              <p className={`font-medium text-blue-600`}>
                                +{processingStatus.aiScoring.averageScoreIncrease || 0} pts
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    {uploadStatus === 'analyzed' && (
                      <>
                        <button
                          onClick={loadPreview}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Preview Data</span>
                        </button>
                        <button
                          onClick={() => startProcessing()}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Play className="h-4 w-4" />
                          <span>Start Processing</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Preview Modal */}
                  {preview && (
                    <div className="mt-4 bg-white rounded-md border p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Data Preview ({preview.totalPreview} of {preview.estimatedTotal} records)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Company</th>
                              <th className="px-3 py-2 text-left">Email</th>
                              <th className="px-3 py-2 text-left">Phone</th>
                              <th className="px-3 py-2 text-left">Title</th>
                              <th className="px-3 py-2 text-left">Industry</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {preview.preview.map((lead, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2">{lead.name || '-'}</td>
                                <td className="px-3 py-2">{lead.company || '-'}</td>
                                <td className="px-3 py-2">{lead.email || '-'}</td>
                                <td className="px-3 py-2">{lead.phone || '-'}</td>
                                <td className="px-3 py-2">{lead.title || '-'}</td>
                                <td className="px-3 py-2">{lead.industry || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Batch History Tab */
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>Batch Processing History</h2>
                <p className={`mt-2 ${themeClasses.textSecondary}`}>
                  View and manage your batch import operations.
                </p>
              </div>

              <div className="space-y-4">
                {batches.map((batch) => (
                  <div key={batch.id} className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className={`h-5 w-5 ${themeClasses.textSecondary}`} />
                        <div>
                          <p className={`font-medium ${themeClasses.textPrimary}`}>{batch.filename}</p>
                          <p className={`text-sm ${themeClasses.textSecondary}`}>
                            Uploaded {new Date(batch.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`text-sm font-medium capitalize ${themeClasses.textPrimary}`}>{batch.status}</p>
                          <p className={`text-xs ${themeClasses.textSecondary}`}>
                            {batch.processedCount}/{batch.totalCount} processed ({batch.progress}%)
                          </p>
                        </div>
                        <button
                          onClick={() => deleteBatch(batch.id)}
                          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {batches.length === 0 && (
                  <div className="text-center py-12">
                    <Users className={`mx-auto h-12 w-12 ${themeClasses.textSecondary}`} />
                    <p className={`mt-4 text-lg font-medium ${themeClasses.textPrimary}`}>No batches yet</p>
                    <p className={`mt-2 ${themeClasses.textSecondary}`}>
                      Upload your first batch to get started with lead processing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sample Files Download */}
      <div className={`mt-6 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg p-4 border border-blue-200`}>
        <h3 className={`font-medium ${isDarkMode ? 'text-blue-200' : 'text-blue-900'} mb-2`}>Sample Files</h3>
        <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} mb-3`}>
          Download sample files to see the expected format for batch imports.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/sample_data/sample_leads.csv"
            download
            className={`flex items-center space-x-2 px-3 py-2 ${isDarkMode ? 'bg-blue-800/30 text-blue-200 hover:bg-blue-700/40' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} rounded-md transition-colors text-sm`}
          >
            <Download className="h-4 w-4" />
            <span>Sample CSV</span>
          </a>
          <a
            href="/sample_data/sample_leads.json"
            download
            className={`flex items-center space-x-2 px-3 py-2 ${isDarkMode ? 'bg-blue-800/30 text-blue-200 hover:bg-blue-700/40' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} rounded-md transition-colors text-sm`}
          >
            <Download className="h-4 w-4" />
            <span>Sample JSON</span>
          </a>
          <a
            href="/sample_data/sample_leads_unstructured.txt"
            download
            className={`flex items-center space-x-2 px-3 py-2 ${isDarkMode ? 'bg-blue-800/30 text-blue-200 hover:bg-blue-700/40' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} rounded-md transition-colors text-sm`}
          >
            <Download className="h-4 w-4" />
            <span>Sample Text</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default BatchLeadUpload;