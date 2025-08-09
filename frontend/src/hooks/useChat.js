import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';

// Generate a UUID v4 for session ID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sessionId] = useState(() => generateUUID());
  const abortControllerRef = useRef(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const history = await chatService.getChatHistory(sessionId);
        setMessages(history);
      } catch (err) {
        console.warn('Failed to load chat history:', err);
        // Don't set error for history loading failure
      }
    };

    loadChatHistory();
  }, [sessionId]);

  const sendMessage = useCallback(async (content, type = 'text') => {
    if (!content.trim() || isLoading) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = {
      id: Date.now().toString(),
      content,
      type,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setError(null);
    setIsLoading(true);
    setIsTyping(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await chatService.sendMessage({
        message: content,
        sessionId,
        type,
        signal: abortControllerRef.current.signal
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        type: 'text',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        sources: response.sources || [],
        confidence: response.confidence,
        metadata: response.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save to history
      await chatService.saveChatHistory(sessionId, [userMessage, assistantMessage]);
      
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Chat error:', err);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: isOnline 
          ? 'Sorry, I encountered an error processing your message. Please try again.'
          : 'You appear to be offline. Please check your connection and try again.',
        type: 'error',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, sessionId, isOnline]);

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(msg => msg.sender === 'user');
    if (lastUserMessage) {
      // Remove the last assistant message (error) and retry
      setMessages(prev => prev.filter(msg => 
        !(msg.sender === 'assistant' && msg.type === 'error')
      ));
      sendMessage(lastUserMessage.content, lastUserMessage.type);
    }
  }, [messages, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    chatService.clearChatHistory(sessionId);
  }, [sessionId]);

  const cancelCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsTyping(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    isTyping,
    error,
    isOnline,
    sendMessage,
    retryLastMessage,
    clearMessages,
    cancelCurrentRequest
  };
};