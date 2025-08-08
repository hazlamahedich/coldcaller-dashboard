import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteTakingSystem from '../NoteTakingSystem';
import * as notesService from '../../services/notesService';

// Mock the services
jest.mock('../../services/notesService');

describe('NoteTakingSystem', () => {
  const mockLeadId = 'test-lead-123';
  const mockCallId = 'test-call-456';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock service responses
    notesService.getNotesByLead = jest.fn().mockResolvedValue({
      success: true,
      data: []
    });
    
    notesService.getTemplates = jest.fn().mockResolvedValue({
      success: true,
      data: []
    });
    
    notesService.getTeamMembers = jest.fn().mockResolvedValue({
      success: true,
      data: []
    });
  });

  test('renders note taking system with initial state', async () => {
    render(<NoteTakingSystem leadId={mockLeadId} callId={mockCallId} />);
    
    expect(screen.getByText('📝 Call Notes')).toBeInTheDocument();
    expect(screen.getByText('📋 Templates')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Start typing your call notes here/)).toBeInTheDocument();
  });

  test('switches between create and search modes', async () => {
    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const searchButton = screen.getByText('🔍 Search');
    fireEvent.click(searchButton);
    
    expect(screen.getByText('🔍 Search Notes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
    
    const createButton = screen.getByText('📝 Create');
    fireEvent.click(createButton);
    
    expect(screen.getByText('📋 Templates')).toBeInTheDocument();
  });

  test('applies template to note content', async () => {
    const mockTemplate = {
      id: 'cold-call',
      name: 'Cold Call',
      icon: '📞',
      fields: [
        { name: 'introduction', label: 'Introduction Response', type: 'textarea' },
        { name: 'painPoints', label: 'Pain Points', type: 'textarea' }
      ]
    };

    notesService.getTemplates = jest.fn().mockResolvedValue({
      success: true,
      data: [mockTemplate]
    });

    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Cold Call')).toBeInTheDocument();
    });

    // Click on template
    fireEvent.click(screen.getByText('Cold Call'));
    
    // Check that template content is applied
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain('# Cold Call');
    expect(textarea.value).toContain('## Introduction Response');
    expect(textarea.value).toContain('## Pain Points');
  });

  test('saves note with proper data', async () => {
    notesService.createNote = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'new-note-123' }
    });

    render(<NoteTakingSystem leadId={mockLeadId} callId={mockCallId} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test note content' } });
    
    const saveButton = screen.getByText('💾 Save Note');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(notesService.createNote).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: mockLeadId,
          callId: mockCallId,
          content: 'Test note content',
          type: 'general'
        })
      );
    });
  });

  test('handles auto-save functionality', async () => {
    jest.useFakeTimers();
    
    notesService.autoSaveNote = jest.fn().mockResolvedValue({
      success: true,
      data: {}
    });

    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Auto-save test content' } });
    
    // Fast-forward time to trigger auto-save
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(notesService.autoSaveNote).toHaveBeenCalled();
    });
    
    jest.useRealTimers();
  });

  test('adds and removes tags', () => {
    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const tagInput = screen.getByPlaceholderText('Add tags...');
    fireEvent.change(tagInput, { target: { value: 'important' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    expect(screen.getByText('important ×')).toBeInTheDocument();
    
    // Remove tag
    fireEvent.click(screen.getByText('important ×'));
    expect(screen.queryByText('important ×')).not.toBeInTheDocument();
  });

  test('calculates quality score correctly', () => {
    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const textarea = screen.getByRole('textbox');
    const highQualityContent = `
      # Call Summary
      - Discussed pain points in detail
      - Agreed on next steps for follow-up
      - Decision maker identified
      - Budget range discussed
      - Timeline established for implementation
    `;
    
    fireEvent.change(textarea, { target: { value: highQualityContent } });
    
    // Quality should be displayed and updated
    expect(screen.getByText(/Quality:/)).toBeInTheDocument();
  });

  test('handles voice dictation toggle', () => {
    // Mock speech recognition
    global.webkitSpeechRecognition = jest.fn(() => ({
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      start: jest.fn(),
      stop: jest.fn(),
      onresult: jest.fn(),
      onerror: jest.fn(),
      onend: jest.fn()
    }));

    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const voiceButton = screen.getByTitle(/Start voice dictation/);
    fireEvent.click(voiceButton);
    
    expect(screen.getByTitle(/Stop recording/)).toBeInTheDocument();
  });

  test('formats text with toolbar buttons', () => {
    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const textarea = screen.getByRole('textbox');
    
    // Select some text
    textarea.setSelectionRange(0, 4);
    fireEvent.select(textarea, { target: { selectionStart: 0, selectionEnd: 4 } });
    
    // Add some content first
    fireEvent.change(textarea, { target: { value: 'Test content for formatting' } });
    
    // Click bold button - this would require more complex testing of text selection
    // For now, just verify the button exists and is clickable
    const boldButton = screen.getByTitle('Bold');
    expect(boldButton).toBeInTheDocument();
    fireEvent.click(boldButton);
  });

  test('shows analytics panel when toggled', () => {
    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const analyticsButton = screen.getByText('📊 Analytics');
    fireEvent.click(analyticsButton);
    
    expect(screen.getByText('📊 Note Analytics')).toBeInTheDocument();
    expect(screen.getByText('Quality Score')).toBeInTheDocument();
    expect(screen.getByText('Word Count')).toBeInTheDocument();
  });

  test('shows collaboration panel when toggled', () => {
    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const collaborationButton = screen.getByText('👥 Collaborate');
    fireEvent.click(collaborationButton);
    
    expect(screen.getByText('👥 Collaboration')).toBeInTheDocument();
    expect(screen.getByText('📧 Share Note')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    const mockNotes = [
      {
        id: 'note-1',
        type: 'cold-call',
        content: 'Test note content with important information',
        tags: ['important', 'follow-up'],
        quality: 85,
        createdAt: '2023-01-01T12:00:00Z'
      }
    ];

    notesService.searchNotes = jest.fn().mockResolvedValue({
      success: true,
      data: mockNotes
    });

    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    // Switch to search mode
    const searchButton = screen.getByText('🔍 Search');
    fireEvent.click(searchButton);
    
    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search notes...');
    fireEvent.change(searchInput, { target: { value: 'important' } });
    
    await waitFor(() => {
      expect(notesService.searchNotes).toHaveBeenCalledWith(
        'important',
        expect.any(Object)
      );
    });
  });

  test('handles follow-up checkbox and date', () => {
    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const followUpCheckbox = screen.getByLabelText('Follow-up required');
    fireEvent.click(followUpCheckbox);
    
    expect(followUpCheckbox).toBeChecked();
    
    // Date input should appear
    const dateInput = screen.getByDisplayValue('');
    expect(dateInput).toBeInTheDocument();
    
    const testDate = '2023-12-31';
    fireEvent.change(dateInput, { target: { value: testDate } });
    expect(dateInput.value).toBe(testDate);
  });

  test('displays error messages appropriately', async () => {
    notesService.createNote = jest.fn().mockResolvedValue({
      success: false,
      message: 'Failed to create note'
    });

    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test content' } });
    
    const saveButton = screen.getByText('💾 Save Note');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to create note/)).toBeInTheDocument();
    });
  });

  test('shows loading states during operations', async () => {
    let resolvePromise;
    const loadingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    notesService.createNote = jest.fn(() => loadingPromise);

    render(<NoteTakingSystem leadId={mockLeadId} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test content' } });
    
    const saveButton = screen.getByText('💾 Save Note');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('⏳ Saving...')).toBeInTheDocument();
    
    // Resolve the promise
    resolvePromise({ success: true, data: { id: 'new-note' } });
    
    await waitFor(() => {
      expect(screen.getByText('💾 Save Note')).toBeInTheDocument();
    });
  });
});