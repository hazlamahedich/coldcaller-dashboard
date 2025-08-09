import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useChat } from '../hooks/useChat';
import { chatService } from '../services/chatService';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

// High contrast style override
const highContrastStyles = {
  color: '#000000',
  fontWeight: '600',
  textShadow: 'none',
  opacity: 1
};

const FloatingChatbot = ({ onClose, initialPosition = { x: 20, y: 20 } }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [quickActions, setQuickActions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const dragControls = useDragControls();
  const chatContainerRef = useRef(null);
  const resizeRef = useRef(null);

  const {
    messages,
    isLoading,
    isTyping,
    error,
    isOnline,
    sendMessage,
    retryLastMessage,
    clearMessages,
    cancelCurrentRequest
  } = useChat();

  // Load quick actions
  useEffect(() => {
    const loadQuickActions = async () => {
      try {
        const actions = await chatService.getQuickActions();
        setQuickActions(actions);
      } catch (err) {
        console.warn('Failed to load quick actions:', err);
      }
    };

    loadQuickActions();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current && !isMinimized) {
      const container = chatContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isMinimized]);

  // Constrain position to viewport
  useEffect(() => {
    const constrainToViewport = () => {
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY))
      }));
    };

    window.addEventListener('resize', constrainToViewport);
    return () => window.removeEventListener('resize', constrainToViewport);
  }, [size]);

  // Handle drag
  const handleDrag = (event, info) => {
    if (!isResizing) {
      setPosition({
        x: Math.max(0, Math.min(info.point.x, window.innerWidth - size.width)),
        y: Math.max(0, Math.min(info.point.y, window.innerHeight - size.height))
      });
    }
  };

  // Handle resize
  const handleResizeStart = (e, handle) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !resizeHandle) return;

    const rect = resizeRef.current.getBoundingClientRect();
    let newWidth = size.width;
    let newHeight = size.height;
    let newX = position.x;
    let newY = position.y;

    switch (resizeHandle) {
      case 'se':
        newWidth = Math.max(300, Math.min(600, e.clientX - rect.left));
        newHeight = Math.max(400, Math.min(800, e.clientY - rect.top));
        break;
      case 'sw':
        newWidth = Math.max(300, Math.min(600, rect.right - e.clientX));
        newHeight = Math.max(400, Math.min(800, e.clientY - rect.top));
        newX = Math.max(0, position.x - (newWidth - size.width));
        break;
      case 'ne':
        newWidth = Math.max(300, Math.min(600, e.clientX - rect.left));
        newHeight = Math.max(400, Math.min(800, rect.bottom - e.clientY));
        newY = Math.max(0, position.y - (newHeight - size.height));
        break;
      case 'nw':
        newWidth = Math.max(300, Math.min(600, rect.right - e.clientX));
        newHeight = Math.max(400, Math.min(800, rect.bottom - e.clientY));
        newX = Math.max(0, position.x - (newWidth - size.width));
        newY = Math.max(0, position.y - (newHeight - size.height));
        break;
      default:
        return;
    }

    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Add mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeHandle]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onClose?.(), 300); // Wait for animation
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const getLastErrorMessage = () => {
    return [...messages].reverse().find(msg => msg.type === 'error');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={resizeRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            x: position.x,
            y: position.y
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            ...highContrastStyles,
            width: size.width,
            height: isMinimized ? 'auto' : size.height,
            position: 'fixed',
            zIndex: 1000,
            left: 0,
            top: 0
          }}
          className="bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden chatbot-container"
          drag
          dragControls={dragControls}
          dragMomentum={false}
          dragElastic={0}
          onDrag={handleDrag}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          whileDrag={{ cursor: 'grabbing' }}
        >
          {/* Header */}
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 cursor-move select-none"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <h3 className="font-semibold text-sm">Cold Calling Assistant</h3>
                {!isOnline && (
                  <span className="text-xs bg-red-500 px-2 py-1 rounded-full">
                    Offline
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMinimize}
                  className="p-1 hover:bg-blue-700 rounded transition-colors duration-200"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMinimized ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    )}
                  </svg>
                </button>
                
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-red-500 rounded transition-colors duration-200"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col"
                style={{ height: size.height - 60 }} // Account for header
              >
                {/* Chat Messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
                  style={{ ...highContrastStyles, maxHeight: size.height - 200 }} // Account for header and input
                >
                  {messages.length === 0 && (
                    <div className="text-center py-8 welcome-text">
                      <div className="text-4xl mb-4">🤖</div>
                      <h4 className="font-bold mb-2 text-lg" style={{ ...highContrastStyles, fontWeight: '700', fontSize: '1.125rem' }}>Welcome to your Cold Calling Assistant!</h4>
                      <p className="text-sm font-semibold" style={{ ...highContrastStyles, fontSize: '0.875rem' }}>
                        I can help you with lead management, calling strategies, analytics, and more.
                      </p>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onRetry={message.type === 'error' ? retryLastMessage : null}
                      isLatest={index === messages.length - 1}
                    />
                  ))}

                  {error && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-sm text-red-800">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold" style={{ color: '#dc2626', fontWeight: '700' }}>Connection error. Please check your network.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Actions */}
                {messages.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-300 bg-gray-50">
                    <button
                      onClick={clearMessages}
                      className="text-xs hover:text-blue-600 underline font-semibold"
                      style={{ color: '#374151', fontWeight: '600' }}
                    >
                      Clear conversation
                    </button>
                  </div>
                )}

                {/* Chat Input */}
                <ChatInput
                  onSendMessage={sendMessage}
                  isLoading={isLoading}
                  isTyping={isTyping}
                  onCancel={cancelCurrentRequest}
                  quickActions={quickActions}
                  placeholder={
                    isOnline 
                      ? "Ask me anything about cold calling..."
                      : "You're offline. Messages will be sent when reconnected."
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resize Handles */}
          {!isMinimized && !isDragging && (
            <>
              {/* Corner resize handles */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
                onMouseDown={(e) => handleResizeStart(e, 'se')}
              >
                <div className="absolute bottom-1 right-1 w-2 h-2 bg-gray-400 transform rotate-45" />
              </div>
              
              <div
                className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize opacity-0 hover:opacity-100 transition-opacity"
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
              >
                <div className="absolute bottom-1 left-1 w-2 h-2 bg-gray-400 transform rotate-45" />
              </div>
              
              <div
                className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize opacity-0 hover:opacity-100 transition-opacity"
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
              >
                <div className="absolute top-1 right-1 w-2 h-2 bg-gray-400 transform rotate-45" />
              </div>
              
              <div
                className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize opacity-0 hover:opacity-100 transition-opacity"
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
              >
                <div className="absolute top-1 left-1 w-2 h-2 bg-gray-400 transform rotate-45" />
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingChatbot;