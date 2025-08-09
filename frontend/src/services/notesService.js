/**
 * Notes Service - Frontend service for note-taking system API calls
 */

import { api } from './api';

class NotesService {
  // Base URL for notes API
  static baseURL = '/api/notes';
  static templatesURL = '/api/note-templates';

  // Notes CRUD operations
  static async createNote(noteData) {
    try {
      const response = await api.post(this.baseURL, noteData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Create note error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create note',
        error: error.response?.data
      };
    }
  }

  static async getNotesByLead(leadId, options = {}) {
    try {
      const params = {
        page: options.page || 1,
        limit: options.limit || 20,
        includeArchived: options.includeArchived || false
      };

      const response = await api.get(`${this.baseURL}/lead/${leadId}`, { params });
      return {
        success: true,
        data: response.data.data.notes,
        pagination: response.data.data.pagination,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get notes by lead error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notes',
        error: error.response?.data
      };
    }
  }

  static async searchNotes(query, filters = {}) {
    try {
      const params = {
        query,
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 20
      };

      const response = await api.get(`${this.baseURL}/search`, { params });
      return {
        success: true,
        data: response.data.data.notes,
        pagination: response.data.data.pagination,
        searchQuery: response.data.data.searchQuery,
        filters: response.data.data.filters,
        message: response.data.message
      };
    } catch (error) {
      console.error('Search notes error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to search notes',
        error: error.response?.data
      };
    }
  }

  static async getNoteById(noteId) {
    try {
      const response = await api.get(`${this.baseURL}/${noteId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get note by ID error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch note',
        error: error.response?.data
      };
    }
  }

  static async updateNote(noteId, updateData) {
    try {
      const response = await api.put(`${this.baseURL}/${noteId}`, updateData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Update note error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update note',
        error: error.response?.data
      };
    }
  }

  static async deleteNote(noteId) {
    try {
      const response = await api.delete(`${this.baseURL}/${noteId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Delete note error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete note',
        error: error.response?.data
      };
    }
  }

  static async restoreNote(noteId) {
    try {
      const response = await api.post(`${this.baseURL}/${noteId}/restore`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Restore note error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to restore note',
        error: error.response?.data
      };
    }
  }

  // Auto-save functionality
  static async autoSaveNote(noteData) {
    try {
      const response = await api.post(`${this.baseURL}/auto-save`, noteData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      // Don't log auto-save errors as they're expected to fail sometimes
      return {
        success: false,
        message: error.response?.data?.message || 'Auto-save failed',
        error: error.response?.data
      };
    }
  }

  // Tag management
  static async addNoteTag(noteId, tag) {
    try {
      const response = await api.post(`${this.baseURL}/${noteId}/tags`, {
        action: 'add',
        tag
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Add note tag error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add tag',
        error: error.response?.data
      };
    }
  }

  static async removeNoteTag(noteId, tag) {
    try {
      const response = await api.post(`${this.baseURL}/${noteId}/tags`, {
        action: 'remove',
        tag
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Remove note tag error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove tag',
        error: error.response?.data
      };
    }
  }

  // Export functionality
  static async exportNote(noteId, format = 'txt') {
    try {
      const response = await api.get(`${this.baseURL}/${noteId}/export`, {
        params: { format },
        responseType: 'blob'
      });

      return {
        success: true,
        data: response.data,
        mimeType: response.headers['content-type'],
        filename: response.headers['content-disposition']?.match(/filename="(.+)"/)?.[1]
      };
    } catch (error) {
      console.error('Export note error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to export note',
        error: error.response?.data
      };
    }
  }

  // Analytics
  static async getNoteAnalytics(leadId = null, dateRange = null) {
    try {
      const params = {};
      if (leadId) params.leadId = leadId;
      if (dateRange) {
        params.dateFrom = dateRange.start;
        params.dateTo = dateRange.end;
      }

      const response = await api.get(`${this.baseURL}/analytics`, { params });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get note analytics error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch analytics',
        error: error.response?.data
      };
    }
  }

  static async getRecentNotes(leadId, limit = 5) {
    try {
      const response = await api.get(`${this.baseURL}/lead/${leadId}/recent`, {
        params: { limit }
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get recent notes error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch recent notes',
        error: error.response?.data
      };
    }
  }

  // Template operations
  static async getTemplates(options = {}) {
    try {
      const params = {
        category: options.category,
        isPublic: options.isPublic,
        includeInactive: options.includeInactive || false,
        search: options.search,
        page: options.page || 1,
        limit: options.limit || 20,
        orderBy: options.orderBy || 'usageCount',
        orderDirection: options.orderDirection || 'DESC'
      };

      const response = await api.get(this.templatesURL, { params });
      return {
        success: true,
        data: response.data.data.templates,
        pagination: response.data.data.pagination,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get templates error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch templates',
        error: error.response?.data
      };
    }
  }

  static async getTemplateById(templateId) {
    try {
      const response = await api.get(`${this.templatesURL}/${templateId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get template by ID error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch template',
        error: error.response?.data
      };
    }
  }

  static async getTemplateBySlug(slug) {
    try {
      const response = await api.get(`${this.templatesURL}/slug/${slug}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get template by slug error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch template',
        error: error.response?.data
      };
    }
  }

  static async createTemplate(templateData) {
    try {
      const response = await api.post(this.templatesURL, templateData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Create template error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create template',
        error: error.response?.data
      };
    }
  }

  static async updateTemplate(templateId, updateData) {
    try {
      const response = await api.put(`${this.templatesURL}/${templateId}`, updateData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Update template error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update template',
        error: error.response?.data
      };
    }
  }

  static async deleteTemplate(templateId) {
    try {
      const response = await api.delete(`${this.templatesURL}/${templateId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Delete template error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete template',
        error: error.response?.data
      };
    }
  }

  static async cloneTemplate(templateId, name, isPublic = false) {
    try {
      const response = await api.post(`${this.templatesURL}/${templateId}/clone`, {
        name,
        isPublic
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Clone template error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to clone template',
        error: error.response?.data
      };
    }
  }

  static async rateTemplate(templateId, rating) {
    try {
      const response = await api.post(`${this.templatesURL}/${templateId}/rate`, { rating });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Rate template error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to rate template',
        error: error.response?.data
      };
    }
  }

  static async getPopularTemplates(limit = 10, category = null) {
    try {
      const params = { limit };
      if (category) params.category = category;

      const response = await api.get(`${this.templatesURL}/popular`, { params });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get popular templates error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch popular templates',
        error: error.response?.data
      };
    }
  }

  static async getSystemTemplates() {
    try {
      const response = await api.get(`${this.templatesURL}/system`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get system templates error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch system templates',
        error: error.response?.data
      };
    }
  }

  static async getUserTemplates(userId, includePublic = true) {
    try {
      const params = { includePublic };
      const response = await api.get(`${this.templatesURL}/user/${userId}`, { params });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get user templates error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch user templates',
        error: error.response?.data
      };
    }
  }

  static async getTemplatesByCategory(category) {
    try {
      const response = await api.get(`${this.templatesURL}/category/${category}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get templates by category error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch templates by category',
        error: error.response?.data
      };
    }
  }

  static async getTemplateAnalytics(templateId = null) {
    try {
      const params = {};
      if (templateId) params.templateId = templateId;

      const response = await api.get(`${this.templatesURL}/analytics`, { params });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get template analytics error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch template analytics',
        error: error.response?.data
      };
    }
  }

  static async getTemplateUsage(templateId, dateRange = null) {
    try {
      const params = {};
      if (dateRange) {
        params.dateFrom = dateRange.start;
        params.dateTo = dateRange.end;
      }

      const response = await api.get(`${this.templatesURL}/${templateId}/usage`, { params });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get template usage error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch template usage',
        error: error.response?.data
      };
    }
  }

  // Saved searches (placeholder - would need backend implementation)
  static async getSavedSearches() {
    try {
      // This would be implemented with actual backend endpoint
      return {
        success: true,
        data: [],
        message: 'Saved searches retrieved successfully'
      };
    } catch (error) {
      console.error('Get saved searches error:', error);
      return {
        success: false,
        message: 'Failed to fetch saved searches',
        error: error
      };
    }
  }

  static async saveSearch(searchData) {
    try {
      // This would be implemented with actual backend endpoint
      return {
        success: true,
        data: { ...searchData, id: Date.now().toString() },
        message: 'Search saved successfully'
      };
    } catch (error) {
      console.error('Save search error:', error);
      return {
        success: false,
        message: 'Failed to save search',
        error: error
      };
    }
  }

  // Team collaboration (placeholder)
  static async getTeamMembers() {
    try {
      // This would be implemented with actual backend endpoint
      return {
        success: true,
        data: [
          { id: '1', name: 'John Doe', status: 'online' },
          { id: '2', name: 'Jane Smith', status: 'online' },
          { id: '3', name: 'Mike Johnson', status: 'away' }
        ],
        message: 'Team members retrieved successfully'
      };
    } catch (error) {
      console.error('Get team members error:', error);
      return {
        success: false,
        message: 'Failed to fetch team members',
        error: error
      };
    }
  }

  // Utility methods
  static formatNoteContent(content, template) {
    if (!template) return content;

    // Apply template formatting
    let formattedContent = content;

    // Add template header if not present
    if (!content.includes(`# ${template.name}`)) {
      const timestamp = new Date().toLocaleDateString();
      formattedContent = `# ${template.name} - ${timestamp}\n\n${content}`;
    }

    return formattedContent;
  }

  static extractActionItems(content) {
    const actionItems = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (
        trimmedLine.toLowerCase().includes('todo') ||
        trimmedLine.toLowerCase().includes('action') ||
        trimmedLine.toLowerCase().includes('follow up') ||
        trimmedLine.includes('[ ]') ||
        (trimmedLine.startsWith('-') && 
         (trimmedLine.toLowerCase().includes('need') || 
          trimmedLine.toLowerCase().includes('should')))
      ) {
        actionItems.push({
          line: index + 1,
          content: trimmedLine,
          completed: trimmedLine.includes('[x]') || trimmedLine.includes('[X]')
        });
      }
    });

    return actionItems;
  }

  static calculateReadingTime(content) {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  static generateNoteSummary(content, maxLength = 150) {
    // Remove markdown formatting for summary
    let summary = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength).trim() + '...';
    }

    return summary || 'No content summary available';
  }
}

export default NotesService;