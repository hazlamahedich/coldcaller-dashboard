import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SourceLink from './SourceLink';

// High contrast style override for text visibility
const highContrastTextStyle = {
  color: '#000000',
  fontWeight: '600',
  textShadow: 'none'
};

const ChatMessage = ({ message, onRetry, isLatest }) => {
  const [showSources, setShowSources] = useState(true); // Show sources by default
  const isUser = message.sender === 'user';
  const isError = message.type === 'error';
  const isSystem = message.sender === 'assistant';

  // Debug logging for assistant messages with sources
  React.useEffect(() => {
    if (isSystem && message.sources && message.sources.length > 0) {
      console.log('🎯 ChatMessage rendering assistant message with sources:', {
        messageId: message.id,
        sourcesCount: message.sources.length,
        sourcesData: message.sources.map(s => ({ title: s.title, url: s.url || 'generated' }))
      });
    }
  }, [isSystem, message.sources, message.id]);

  // Enhanced debugging for source rendering
  React.useEffect(() => {
    if (isSystem && message.sources) {
      console.log('🎯 ChatMessage rendering assistant message:', {
        messageId: message.id,
        sender: message.sender,
        isSystem,
        sourcesCount: message.sources.length,
        showSources,
        sources: message.sources
      });
    }
  }, [message, isSystem, showSources]);

  // Generate proper document URL from source data
  const generateDocumentUrl = (source) => {
    // External sources use their direct URLs
    if (source.type === 'external' && source.url) {
      return source.url;
    }
    
    // If source has a direct URL, use it
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
      return `http://localhost:3001/api/documents/${encodeURIComponent(sourcePath)}`;
    }
    
    // For simple filenames, use them directly
    if (sourcePath.includes('/')) {
      // Remove directory path, use just filename
      sourcePath = sourcePath.split('/').pop();
    }
    
    return `http://localhost:3001/api/documents/${encodeURIComponent(sourcePath)}`;
  };

  const handleSourceClick = (source) => {
    // Track source clicks for analytics
    console.log('Source accessed from chat:', {
      messageId: message.id,
      sourceTitle: source.title,
      sourceUrl: source.url,
      timestamp: new Date().toISOString()
    });
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
        mass: 1
      }
    }
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-[80%]`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : isError 
              ? 'bg-red-500 text-white'
              : 'bg-gray-300 text-gray-700'
        }`}>
          {isUser ? 'U' : isError ? '!' : 'AI'}
        </div>

        {/* Message Content */}
        <div className={`${isUser ? 'mr-2' : 'ml-2'} flex flex-col`}>
          <div
            className={`px-4 py-2 rounded-2xl shadow-sm ${
              isUser
                ? 'bg-blue-500 text-white rounded-br-sm'
                : isError
                  ? 'bg-red-50 text-red-800 border border-red-300 rounded-bl-sm'
                  : 'bg-gray-100 text-black border border-gray-300 rounded-bl-sm'
            } max-w-full word-wrap`}
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium message-content" style={isUser ? {} : highContrastTextStyle}>
              {message.content}
            </div>

            {/* Confidence indicator for assistant messages */}
            {isSystem && message.confidence && (
              <div className={`text-xs mt-1 ${getConfidenceColor(message.confidence)}`}>
                Confidence: {Math.round(message.confidence * 100)}%
              </div>
            )}
          </div>

          {/* Message metadata */}
          <div className={`text-xs mt-1 message-timestamp ${isUser ? 'text-right' : 'text-left'}`} style={highContrastTextStyle}>
            {formatTimestamp(message.timestamp)}
            {message.cached && (
              <span className="ml-2 text-orange-500">• Cached</span>
            )}
          </div>

          {/* Sources section for assistant messages */}
          {isSystem && message.sources && message.sources.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowSources(!showSources)}
                className="text-xs hover:text-blue-900 hover:bg-blue-50 flex items-center font-semibold px-2 py-1 rounded-md border border-blue-300 transition-all duration-200"
                style={{ color: '#1d4ed8', fontWeight: '700', backgroundColor: showSources ? '#eff6ff' : 'transparent' }}
                aria-expanded={showSources}
                aria-controls={`sources-${message.id}`}
                title={showSources ? 'Hide sources' : 'Show sources'}
              >
                <span className="mr-1">
                  {showSources ? '▼' : '▶'}
                </span>
                📚 {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              </button>
              
              <AnimatePresence>
                {showSources && (
                  <motion.div
                    id={`sources-${message.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-1 overflow-hidden"
                  >
                    {message.sources.map((source, index) => (
                      <div key={index} className="text-xs bg-gray-100 p-3 rounded-lg border-l-4 border-blue-400 hover:bg-gray-50 transition-colors duration-200">
                        <div className="font-semibold text-gray-900 mb-2" style={{ fontWeight: '700' }}>
                          {source.title}
                        </div>
                        {source.snippet && (
                          <div className="mt-1 mb-2 text-gray-700 line-clamp-2" style={highContrastTextStyle}>
                            {source.snippet}
                          </div>
                        )}
                        {source.section && (
                          <div className="text-xs text-gray-500 mb-2">
                            Section: {source.section}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <SourceLink 
                            source={{
                              ...source,
                              url: source.url || generateDocumentUrl(source)
                            }} 
                            onSourceClick={handleSourceClick}
                          />
                          {source.similarity && (
                            <span 
                              className="text-xs px-2 py-1 rounded-full text-white font-medium ml-2"
                              style={{ 
                                backgroundColor: source.similarity >= 0.8 ? '#10b981' : 
                                                 source.similarity >= 0.6 ? '#f59e0b' : '#ef4444'
                              }}
                              title={`Relevance: ${Math.round(source.similarity * 100)}%`}
                            >
                              {Math.round(source.similarity * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Retry button for error messages */}
          {isError && onRetry && isLatest && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-full transition-colors duration-200 self-start"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;