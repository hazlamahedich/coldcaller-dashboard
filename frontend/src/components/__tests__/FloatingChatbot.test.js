import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FloatingChatbot from '../FloatingChatbot';
import { useChat } from '../../hooks/useChat';

// Mock framer-motion to avoid issues with animations in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <div>{children}</div>,
  useDragControls: () => ({
    start: jest.fn(),
  }),
}));

// Mock the useChat hook
jest.mock('../../hooks/useChat');
const mockUseChat = useChat;

// Mock chatService
jest.mock('../../services/chatService', () => ({
  chatService: {
    getQuickActions: jest.fn().mockResolvedValue([
      { id: 'help', label: 'Help', icon: '❓', message: 'How can I help?' }
    ]),
  },
}));

describe('FloatingChatbot', () => {
  const mockChatHook = {
    messages: [],
    isLoading: false,
    isTyping: false,
    error: null,
    isOnline: true,
    sendMessage: jest.fn(),
    retryLastMessage: jest.fn(),
    clearMessages: jest.fn(),
    cancelCurrentRequest: jest.fn(),
  };

  beforeEach(() => {
    mockUseChat.mockReturnValue(mockChatHook);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders floating chatbot with header', () => {
    render(<FloatingChatbot onClose={jest.fn()} />);
    
    expect(screen.getByText('Cold Calling Assistant')).toBeInTheDocument();
  });

  test('displays online status indicator', () => {
    render(<FloatingChatbot onClose={jest.fn()} />);
    
    const onlineIndicator = document.querySelector('.bg-green-400.rounded-full.animate-pulse');
    expect(onlineIndicator).toBeInTheDocument();
  });

  test('shows offline status when not online', () => {
    mockUseChat.mockReturnValue({
      ...mockChatHook,
      isOnline: false,
    });

    render(<FloatingChatbot onClose={jest.fn()} />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  test('can be minimized and expanded', () => {
    render(<FloatingChatbot onClose={jest.fn()} />);
    
    const minimizeButton = screen.getByTitle('Minimize');
    fireEvent.click(minimizeButton);
    
    // After minimizing, the button should show expand option
    expect(screen.getByTitle('Expand')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', async () => {
    const mockOnClose = jest.fn();
    render(<FloatingChatbot onClose={mockOnClose} />);
    
    const closeButton = screen.getByTitle('Close');
    fireEvent.click(closeButton);
    
    // Should call onClose after animation delay
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  test('displays welcome message when no messages', () => {
    render(<FloatingChatbot onClose={jest.fn()} />);
    
    expect(screen.getByText('Welcome to your Cold Calling Assistant!')).toBeInTheDocument();
    expect(screen.getByText(/I can help you with lead management/)).toBeInTheDocument();
  });

  test('displays messages from chat hook', () => {
    const messages = [
      {
        id: '1',
        content: 'Hello!',
        type: 'text',
        sender: 'user',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        content: 'Hi there! How can I help?',
        type: 'text',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseChat.mockReturnValue({
      ...mockChatHook,
      messages,
    });

    render(<FloatingChatbot onClose={jest.fn()} />);
    
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there! How can I help?')).toBeInTheDocument();
  });

  test('shows error message when there is an error', () => {
    mockUseChat.mockReturnValue({
      ...mockChatHook,
      error: 'Connection failed',
    });

    render(<FloatingChatbot onClose={jest.fn()} />);
    
    expect(screen.getByText(/Connection error/)).toBeInTheDocument();
  });

  test('displays clear conversation button when messages exist', () => {
    const messages = [
      {
        id: '1',
        content: 'Hello!',
        type: 'text',
        sender: 'user',
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseChat.mockReturnValue({
      ...mockChatHook,
      messages,
    });

    render(<FloatingChatbot onClose={jest.fn()} />);
    
    expect(screen.getByText('Clear conversation')).toBeInTheDocument();
  });

  test('calls clearMessages when clear button is clicked', () => {
    const messages = [
      {
        id: '1',
        content: 'Hello!',
        type: 'text',
        sender: 'user',
        timestamp: new Date().toISOString(),
      },
    ];

    const mockClearMessages = jest.fn();
    mockUseChat.mockReturnValue({
      ...mockChatHook,
      messages,
      clearMessages: mockClearMessages,
    });

    render(<FloatingChatbot onClose={jest.fn()} />);
    
    const clearButton = screen.getByText('Clear conversation');
    fireEvent.click(clearButton);
    
    expect(mockClearMessages).toHaveBeenCalled();
  });
});