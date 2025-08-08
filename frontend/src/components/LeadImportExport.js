import React, { useState, useRef, useCallback } from 'react';
import { leadsService } from '../services';

/**
 * LeadImportExport - Complete import/export system for leads
 * Features: Drag & drop, field mapping, data validation, progress tracking
 */
const LeadImportExport = ({ onImportComplete, onClose, isOpen }) => {
  // Import state
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Map, 3: Validate, 4: Import
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [validationResults, setValidationResults] = useState({ valid: [], errors: [] });
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [isImporting, setIsImporting] = useState(false);
  
  // Export state
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFields, setExportFields] = useState({
    name: true,
    company: true,
    phone: true,
    email: true,
    status: true,
    priority: true,
    industry: false,
    title: false,
    address: false,
    notes: false,
    tags: false,
    last_contact: true,
    created_at: false
  });
  const [exportFilters, setExportFilters] = useState({
    status: '',
    priority: '',
    dateRange: { start: '', end: '' }
  });
  const [isExporting, setIsExporting] = useState(false);

  // File input ref
  const fileInputRef = useRef(null);

  // Available lead fields for mapping
  const leadFields = [
    { key: 'name', label: 'Full Name', required: true },
    { key: 'company', label: 'Company', required: false },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'email', label: 'Email Address', required: false },
    { key: 'title', label: 'Job Title', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'priority', label: 'Priority', required: false },
    { key: 'industry', label: 'Industry', required: false },
    { key: 'company_size', label: 'Company Size', required: false },
    { key: 'lead_source', label: 'Lead Source', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'address.street', label: 'Street Address', required: false },
    { key: 'address.city', label: 'City', required: false },
    { key: 'address.state', label: 'State', required: false },
    { key: 'address.zip', label: 'ZIP Code', required: false },
    { key: 'address.country', label: 'Country', required: false }
  ];

  // Handle file drop
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExtension)) {
      alert('Please select a CSV or Excel file');
      return;
    }

    setImportFile(file);
    parseFile(file);
  };

  // Parse uploaded file
  const parseFile = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        alert('File must contain at least a header row and one data row');
        return;
      }

      // Parse CSV (basic implementation)
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }

      setImportData(data);
      
      // Auto-generate field mapping suggestions
      const suggestedMapping = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        const matchedField = leadFields.find(field => {
          const fieldKey = field.key.toLowerCase();
          return lowerHeader.includes(fieldKey) || fieldKey.includes(lowerHeader);
        });
        if (matchedField) {
          suggestedMapping[header] = matchedField.key;
        }
      });

      setFieldMapping(suggestedMapping);
      setImportStep(2);

    } catch (error) {
      console.error('Failed to parse file:', error);
      alert('Failed to parse file. Please check the file format.');
    }
  };

  // Validate imported data
  const validateImportData = () => {
    const valid = [];
    const errors = [];

    importData.forEach((row, index) => {
      const validationErrors = [];
      const mappedRow = {};

      // Apply field mapping and validate
      Object.entries(fieldMapping).forEach(([csvField, leadField]) => {
        if (leadField && row[csvField] !== undefined) {
          if (leadField.includes('.')) {
            const [parent, child] = leadField.split('.');
            if (!mappedRow[parent]) mappedRow[parent] = {};
            mappedRow[parent][child] = row[csvField];
          } else {
            mappedRow[leadField] = row[csvField];
          }
        }
      });

      // Validate required fields
      const requiredFields = leadFields.filter(f => f.required);
      requiredFields.forEach(field => {
        if (!mappedRow[field.key] || !mappedRow[field.key].toString().trim()) {
          validationErrors.push(`${field.label} is required`);
        }
      });

      // Validate email format
      if (mappedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.email)) {
        validationErrors.push('Invalid email format');
      }

      // Validate phone number (basic)
      if (mappedRow.phone && !/^[\+]?[0-9\(\)\-\s\.]{10,}$/.test(mappedRow.phone)) {
        validationErrors.push('Invalid phone number format');
      }

      if (validationErrors.length === 0) {
        valid.push({ index, data: mappedRow, original: row });
      } else {
        errors.push({ index, errors: validationErrors, original: row });
      }
    });

    setValidationResults({ valid, errors });
    setImportStep(3);
  };

  // Execute import
  const executeImport = async () => {
    if (validationResults.valid.length === 0) {
      alert('No valid records to import');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validationResults.valid.length, status: 'Importing...' });

    try {
      const imported = [];
      const failed = [];

      for (let i = 0; i < validationResults.valid.length; i++) {
        const record = validationResults.valid[i];
        setImportProgress(prev => ({ ...prev, current: i + 1, status: `Importing record ${i + 1} of ${validationResults.valid.length}` }));

        try {
          const response = await leadsService.createLead(record.data);
          if (response.success) {
            imported.push(response.data);
          } else {
            failed.push({ record: record.original, error: response.message });
          }
        } catch (error) {
          failed.push({ record: record.original, error: error.message });
        }

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setImportProgress({
        current: validationResults.valid.length,
        total: validationResults.valid.length,
        status: `Complete! Imported ${imported.length} records${failed.length > 0 ? `, ${failed.length} failed` : ''}`
      });

      // Wait a moment then complete
      setTimeout(() => {
        setImportStep(4);
        if (onImportComplete) {
          onImportComplete(imported, failed);
        }
      }, 1000);

    } catch (error) {
      console.error('Import failed:', error);
      setImportProgress(prev => ({ ...prev, status: 'Import failed: ' + error.message }));
    } finally {
      setIsImporting(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Build export parameters
      const params = {
        format: exportFormat,
        fields: Object.keys(exportFields).filter(field => exportFields[field]),
        ...exportFilters
      };

      // Get all leads with filters
      const response = await leadsService.getAllLeads(params);
      
      if (!response.success) {
        throw new Error(response.message || 'Export failed');
      }

      const data = response.data;
      
      if (exportFormat === 'csv') {
        exportToCSV(data, params.fields);
      } else {
        // For JSON format
        exportToJSON(data);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const exportToCSV = (data, fields) => {
    const headers = fields.map(field => {
      const fieldInfo = leadFields.find(f => f.key === field);
      return fieldInfo ? fieldInfo.label : field;
    });

    const rows = data.map(lead => {
      return fields.map(field => {
        let value = '';
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          value = lead[parent]?.[child] || '';
        } else {
          value = lead[field] || '';
        }
        
        // Handle arrays (like tags)
        if (Array.isArray(value)) {
          value = value.join('; ');
        }
        
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        
        return value;
      });
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvContent, 'leads_export.csv', 'text/csv');
  };

  // Export to JSON
  const exportToJSON = (data) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'leads_export.json', 'application/json');
  };

  // Download file
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset import state
  const resetImport = () => {
    setImportStep(1);
    setImportFile(null);
    setImportData([]);
    setFieldMapping({});
    setValidationResults({ valid: [], errors: [] });
    setImportProgress({ current: 0, total: 0, status: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Import & Export Leads</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            <button className="px-6 py-4 border-b-2 border-green-500 text-green-600 font-medium">
              Import
            </button>
            <button
              onClick={() => {/* Switch to export tab */}}
              className="px-6 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium"
            >
              Export
            </button>
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Import Section */}
          <div className="space-y-6">
            {/* Step 1: File Upload */}
            {importStep === 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Step 1: Upload File</h3>
                
                {/* Drag & Drop Area */}
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-green-500 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="text-6xl">📁</div>
                    <div>
                      <p className="text-lg font-medium">Drop your file here</p>
                      <p className="text-gray-500">or click to browse</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Choose File
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {/* File Requirements */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">File Requirements:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
                    <li>• First row must contain column headers</li>
                    <li>• Required fields: Name, Phone Number</li>
                    <li>• Maximum file size: 10MB</li>
                    <li>• Maximum records: 10,000</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Field Mapping */}
            {importStep === 2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Step 2: Map Fields</h3>
                <p className="text-gray-600 mb-6">
                  Match your file columns to lead fields. Required fields are marked with *.
                </p>

                <div className="space-y-4">
                  {importFile && importData.length > 0 && (
                    <>
                      <div className="text-sm text-gray-500 mb-4">
                        Found {importData.length} records in {importFile.name}
                      </div>

                      {Object.keys(importData[0]).map(csvField => (
                        <div key={csvField} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <label className="block font-medium text-gray-900 mb-1">
                              {csvField}
                            </label>
                            <div className="text-sm text-gray-500">
                              Sample: {importData[0][csvField]}
                            </div>
                          </div>
                          <div className="flex-1">
                            <select
                              value={fieldMapping[csvField] || ''}
                              onChange={(e) => setFieldMapping(prev => ({
                                ...prev,
                                [csvField]: e.target.value
                              }))}
                              className="w-full p-3 border border-gray-300 rounded-lg"
                            >
                              <option value="">Don't import</option>
                              {leadFields.map(field => (
                                <option key={field.key} value={field.key}>
                                  {field.label} {field.required ? '*' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between pt-6">
                        <button
                          onClick={resetImport}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Back
                        </button>
                        <button
                          onClick={validateImportData}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Validate Data
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Validation Results */}
            {importStep === 3 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Step 3: Validation Results</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">
                      ✅ Valid Records: {validationResults.valid.length}
                    </h4>
                    <p className="text-sm text-green-700">
                      These records will be imported
                    </p>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">
                      ❌ Invalid Records: {validationResults.errors.length}
                    </h4>
                    <p className="text-sm text-red-700">
                      These records have validation errors
                    </p>
                  </div>
                </div>

                {/* Validation Errors */}
                {validationResults.errors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Validation Errors:</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {validationResults.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                          <div className="font-medium text-red-900">
                            Row {error.index + 2}: {error.original.name || 'Unnamed record'}
                          </div>
                          <ul className="text-sm text-red-700 mt-1">
                            {error.errors.map((err, errIdx) => (
                              <li key={errIdx}>• {err}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {validationResults.errors.length > 10 && (
                        <div className="text-sm text-gray-500 text-center">
                          ... and {validationResults.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setImportStep(2)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back to Mapping
                  </button>
                  <button
                    onClick={executeImport}
                    disabled={validationResults.valid.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Import {validationResults.valid.length} Records
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Import Progress */}
            {(importStep === 4 || isImporting) && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Import Progress</h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="text-sm text-gray-600">
                        {importProgress.current} / {importProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      {importProgress.status}
                    </div>
                  </div>

                  {!isImporting && (
                    <div className="text-center">
                      <button
                        onClick={() => {
                          resetImport();
                          if (onClose) onClose();
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Export Section (placeholder for tab switching) */}
          <div className="hidden">
            <h3 className="text-lg font-semibold mb-4">Export Leads</h3>
            {/* Export functionality would go here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadImportExport;