import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// High contrast style override for text visibility
const highContrastTextStyle = {
  color: '#000000',
  fontWeight: '600',
  textShadow: 'none'
};

const ChatInput = ({ 
  onSendMessage, 
  isLoading, 
  isTyping, 
  onCancel, 
  placeholder = "Ask me anything about cold calling...",
  quickActions = []
}) => {
  const [message, setMessage] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // ~4 lines
      
      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
        setIsMultiline(true);
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
        setIsMultiline(scrollHeight > 44); // ~2 lines
      }
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      setIsMultiline(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = (action) => {
    onSendMessage(action.message);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, just send a message about the file
      // In a real implementation, you'd upload and process the file
      onSendMessage(`Analyze this file: ${file.name}`);
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAction(action)}
                className="inline-flex items-center px-3 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded-full transition-colors duration-200 font-medium"
                style={highContrastTextStyle}
                disabled={isLoading}
              >
                <span className="mr-1" role="img" aria-label={action.label}>
                  {action.icon}
                </span>
                {action.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-4 py-2 text-sm border-b border-gray-200 font-medium bg-gray-50" style={highContrastTextStyle}>
          <div className="flex items-center space-x-1">
            <span style={highContrastTextStyle}>AI is typing</span>
            <div className="flex space-x-1">
              <motion.div
                className="w-1 h-1 bg-gray-400 rounded-full"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-1 h-1 bg-gray-400 rounded-full"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-1 h-1 bg-gray-400 rounded-full"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="ml-2 text-xs hover:text-red-800 font-medium"
                style={{ color: '#dc2626', fontWeight: '700' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end space-x-2">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            disabled={isLoading}
            title="Upload file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 font-medium ${
                isMultiline ? 'rounded-lg' : 'rounded-full'
              }`}
              rows={1}
              disabled={isLoading}
              style={{ minHeight: '40px', ...highContrastTextStyle }}
            />
            
            {/* Character count for long messages */}
            {message.length > 200 && (
              <div className="absolute -top-6 right-0 text-xs text-gray-500">
                {message.length}/1000
              </div>
            )}
          </div>

          {/* Send Button */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!message.trim() || isLoading}
            className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
              message.trim() && !isLoading
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Send message"
          >
            {isLoading ? (
              <motion.div
                className="w-5 h-5"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </motion.button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.txt"
        />

        {/* Keyboard shortcut hint */}
        <div className="text-xs mt-2 text-center font-semibold keyboard-hint" style={{ ...highContrastTextStyle, fontWeight: '700' }}>
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
};

export default ChatInput;