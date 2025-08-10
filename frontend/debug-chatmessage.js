// Debug script to test ChatMessage component with sources
const testMessage = {
  id: '123',
  content: 'Here is some information about Twilio integration.',
  type: 'text',
  sender: 'assistant',
  timestamp: new Date().toISOString(),
  sources: [
    {
      title: 'Twilio Quick Start Guide',
      snippet: 'Getting started with Twilio Voice API...',
      section: 'Voice API',
      url: '/api/documents/twilio-quick-start.md',
      similarity: 0.95
    },
    {
      title: 'Integration Setup Documentation',
      snippet: 'Configure your Twilio credentials and endpoints...',
      section: 'Configuration',
      source: '../docs/integration-guide.md',
      similarity: 0.87
    }
  ],
  confidence: 0.92
};

console.log('Test message structure:', JSON.stringify(testMessage, null, 2));

// Test the generateDocumentUrl function logic
const generateDocumentUrl = (source) => {
  if (source.url) return source.url;
  
  // Handle different source path formats from RAG system
  let sourcePath = source.source || source.title || '';
  
  // Clean up the path
  if (sourcePath.startsWith('../')) {
    // Remove ../ prefix and use just the filename
    sourcePath = sourcePath.replace('../', '');
  }
  
  if (sourcePath.startsWith('src/')) {
    // For src/ paths, encode the full path
    return `/api/documents/${encodeURIComponent(sourcePath)}`;
  }
  
  // For simple filenames, use them directly
  if (sourcePath.includes('/')) {
    // Remove directory path, use just filename
    sourcePath = sourcePath.split('/').pop();
  }
  
  return `/api/documents/${encodeURIComponent(sourcePath)}`;
};

// Test URL generation for each source
testMessage.sources.forEach((source, index) => {
  const url = generateDocumentUrl(source);
  console.log(`Source ${index + 1} URL:`, url);
  console.log(`Source ${index + 1} data:`, source);
});