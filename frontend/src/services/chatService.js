import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (you'll need to add your keys to environment variables)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

class ChatService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_CHAT_API_URL || '/api/rag';
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  async sendMessage({ message, sessionId, type = 'text', signal }) {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          conversationId: sessionId,
          timestamp: new Date().toISOString()
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      const cacheKey = `${message}-${type}`;
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, data);

      return {
        response: data.response,
        sources: data.sources || [],
        confidence: data.confidence || 0.8,
        metadata: data.metadata || {},
        cached: data.cached || false
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Check cache for fallback
      const cacheKey = `${message}-${type}`;
      if (this.cache.has(cacheKey)) {
        const cachedResponse = this.cache.get(cacheKey);
        return {
          ...cachedResponse,
          cached: true
        };
      }

      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async getChatHistory(sessionId) {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;
        return data?.map(item => JSON.parse(item.message_data)) || [];
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(`chat_history_${sessionId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  async saveChatHistory(sessionId, messages) {
    try {
      if (supabase) {
        const user = await this.getCurrentUser();
        const records = messages.map(message => ({
          session_id: sessionId,
          user_id: user?.id,
          message_data: JSON.stringify(message),
          created_at: message.timestamp
        }));

        const { error } = await supabase
          .from('chat_history')
          .upsert(records);

        if (error) throw error;
        return;
      }

      // Fallback to localStorage
      const existing = await this.getChatHistory(sessionId);
      const updated = [...existing, ...messages];
      localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  async clearChatHistory(sessionId) {
    try {
      if (supabase) {
        const { error } = await supabase
          .from('chat_history')
          .delete()
          .eq('session_id', sessionId);

        if (error) throw error;
        return;
      }

      // Fallback to localStorage
      localStorage.removeItem(`chat_history_${sessionId}`);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  }

  async getAuthToken() {
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
      }
      return localStorage.getItem('auth_token');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  async getCurrentUser() {
    try {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // Quick action handlers
  async getQuickActions() {
    return [
      {
        id: 'help',
        label: 'Help',
        icon: '❓',
        message: 'How can I help you today?'
      },
      {
        id: 'leads',
        label: 'Lead Info',
        icon: '👤',
        message: 'Tell me about lead management and scoring'
      },
      {
        id: 'calling',
        label: 'Calling Tips',
        icon: '📞',
        message: 'Give me some cold calling best practices'
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: '📊',
        message: 'How do I analyze my call performance?'
      }
    ];
  }

  async searchKnowledgeBase(query) {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: query,
          searchOnly: true 
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Knowledge base search error:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();