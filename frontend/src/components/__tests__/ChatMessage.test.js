import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatMessage from '../ChatMessage';

// Mock framer-motion to avoid issues with animations in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <div>{children}</div>,
}));

// Mock SourceLink component
jest.mock('../SourceLink', () => {
  return function MockSourceLink({ source, onSourceClick }) {
    return (
      <div data-testid="source-link">
        <a href={source.url} onClick={() => onSourceClick?.(source)}>
          📖 View Document - {source.title}
        </a>
      </div>
    );
  };
});

describe('ChatMessage', () => {
  const baseMessage = {
    id: '123',
    content: 'Test message content',
    type: 'text',
    sender: 'assistant',
    timestamp: new Date().toISOString(),
  };

  test('renders message content correctly', () => {
    render(<ChatMessage message={baseMessage} />);
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  test('shows user avatar for user messages', () => {
    const userMessage = { ...baseMessage, sender: 'user' };
    render(<ChatMessage message={userMessage} />);
    
    const avatar = screen.getByText('U');
    expect(avatar).toBeInTheDocument();
  });

  test('shows AI avatar for assistant messages', () => {
    render(<ChatMessage message={baseMessage} />);
    
    const avatar = screen.getByText('AI');
    expect(avatar).toBeInTheDocument();
  });

  test('displays confidence indicator for assistant messages with confidence', () => {
    const messageWithConfidence = {
      ...baseMessage,
      confidence: 0.85
    };
    
    render(<ChatMessage message={messageWithConfidence} />);
    expect(screen.getByText('Confidence: 85%')).toBeInTheDocument();
  });

  test('displays sources when available', () => {
    const messageWithSources = {
      ...baseMessage,
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
      ]
    };

    render(<ChatMessage message={messageWithSources} />);
    
    // Should show source count button with emoji
    expect(screen.getByText('📚 2 sources')).toBeInTheDocument();
  });

  test('toggles sources visibility when button is clicked', async () => {
    const messageWithSources = {
      ...baseMessage,
      sources: [
        {
          title: 'Test Document',
          snippet: 'Test content...',
          url: '/api/documents/test.md',
          similarity: 0.90
        }
      ]
    };

    render(<ChatMessage message={messageWithSources} />);
    
    const sourcesButton = screen.getByText('📚 1 source');
    
    // Sources should be visible initially (default expanded)
    expect(screen.getByTestId('source-link')).toBeInTheDocument();
    
    // Click to hide sources
    fireEvent.click(sourcesButton);
    
    // Sources should now be hidden
    await waitFor(() => {
      expect(screen.queryByTestId('source-link')).not.toBeInTheDocument();
    });
  });

  test('renders SourceLink components for each source when expanded', async () => {
    const messageWithSources = {
      ...baseMessage,
      sources: [
        {
          title: 'Document 1',
          snippet: 'Content 1...',
          url: '/api/documents/doc1.md',
          similarity: 0.95
        },
        {
          title: 'Document 2',
          snippet: 'Content 2...',
          url: '/api/documents/doc2.md',
          similarity: 0.87
        }
      ]
    };

    render(<ChatMessage message={messageWithSources} />);
    
    // Sources should already be expanded by default
    // const sourcesButton = screen.getByText('📚 2 sources');
    // fireEvent.click(sourcesButton);
    
    await waitFor(() => {
      // Should render a SourceLink for each source
      const sourceLinks = screen.getAllByTestId('source-link');
      expect(sourceLinks).toHaveLength(2);
      
      // Check that source titles are displayed
      expect(screen.getByText('📖 View Document - Document 1')).toBeInTheDocument();
      expect(screen.getByText('📖 View Document - Document 2')).toBeInTheDocument();
    });
  });

  test('displays source snippets and sections when available', async () => {
    const messageWithSources = {
      ...baseMessage,
      sources: [
        {
          title: 'Test Document',
          snippet: 'This is a test snippet content',
          section: 'Getting Started',
          url: '/api/documents/test.md',
          similarity: 0.90
        }
      ]
    };

    render(<ChatMessage message={messageWithSources} />);
    
    // Sources should already be expanded by default
    await waitFor(() => {
      // Check snippet and section are displayed
      expect(screen.getByText('This is a test snippet content')).toBeInTheDocument();
      expect(screen.getByText('Section: Getting Started')).toBeInTheDocument();
    });
  });

  test('generates document URLs correctly for sources without URLs', async () => {
    const messageWithSources = {
      ...baseMessage,
      sources: [
        {
          title: 'Document Without URL',
          source: '../docs/guide.md',
          snippet: 'Some content...',
          similarity: 0.85
        }
      ]
    };

    render(<ChatMessage message={messageWithSources} />);
    
    // Sources should already be expanded by default
    await waitFor(() => {
      const sourceLink = screen.getByTestId('source-link');
      const link = sourceLink.querySelector('a');
      // Should generate URL from source path
      expect(link.href).toMatch(/\/api\/documents\/guide\.md$/);
    });
  });

  test('handles error messages with retry button', () => {
    const errorMessage = {
      ...baseMessage,
      type: 'error',
      content: 'An error occurred'
    };
    
    const mockRetry = jest.fn();
    
    render(<ChatMessage message={errorMessage} onRetry={mockRetry} isLatest={true} />);
    
    // Should show error styling and retry button
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    
    // Clicking retry should call the handler
    fireEvent.click(screen.getByText('Retry'));
    expect(mockRetry).toHaveBeenCalled();
  });

  test('formats timestamp correctly', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    const messageWithTimestamp = {
      ...baseMessage,
      timestamp: testDate.toISOString()
    };
    
    render(<ChatMessage message={messageWithTimestamp} />);
    
    // Should display formatted time (exact format depends on locale)
    const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
  });
});