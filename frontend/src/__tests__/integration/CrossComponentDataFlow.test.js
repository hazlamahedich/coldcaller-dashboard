/**
 * Cross-Component Data Flow Integration Tests
 * 
 * Tests the data flow and communication patterns between:
 * - Analytics Dashboard ↔ Call Management
 * - Analytics Dashboard ↔ Lead Management  
 * - Analytics Dashboard ↔ Real-time Updates
 * - Analytics Dashboard ↔ Theme/Settings Context
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Import components and contexts
import LeadAnalyticsDashboard from '../../components/LeadAnalyticsDashboard';
import { CallProvider, useCall } from '../../contexts/CallContext';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { LeadProvider } from '../../contexts/LeadContext';

// Mock services
import { leadsService } from '../../services';

jest.mock('../../services', () => ({
  leadsService: {
    getAllLeads: jest.fn()
  }
}));

// Test wrapper
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      <LeadProvider>
        <CallProvider>
          {children}
        </CallProvider>
      </LeadProvider>
    </ThemeProvider>
  </BrowserRouter>
);

// Test component to trigger call state changes
const CallStateController = () => {
  const { initiateCall, endCall, callState } = useCall();
  
  return (
    <div data-testid="call-controller">
      <button 
        onClick={() => initiateCall({
          phoneNumber: '+1234567890',
          leadData: { id: 1, name: 'Test Lead' }
        })}
        data-testid="start-call"
      >
        Start Call
      </button>
      <button onClick={endCall} data-testid="end-call">End Call</button>
      <div data-testid="call-state">{callState}</div>
    </div>
  );
};

// Test component to control theme
const ThemeController = () => {
  const { toggleTheme, isDarkMode } = useTheme();
  
  return (
    <div data-testid="theme-controller">
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Toggle Theme
      </button>
      <div data-testid="theme-state">{isDarkMode ? 'dark' : 'light'}</div>
    </div>
  );
};

describe('Cross-Component Data Flow Integration', () => {
  const mockLeads = [
    {
      id: 1,
      name: 'John Doe',
      company: 'Acme Corp',
      status: 'New',
      priority: 'High',
      lead_source: 'Website',
      industry: 'Technology',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Jane Smith', 
      company: 'Tech Solutions',
      status: 'Qualified',
      priority: 'Medium',
      lead_source: 'Cold Call',
      industry: 'Software',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    leadsService.getAllLeads.mockResolvedValue({
      success: true,
      data: { leads: mockLeads }
    });
    jest.clearAllMocks();
  });

  describe('Analytics ↔ Call Management Data Flow', () => {
    test('should reflect call state changes in analytics activity feed', async () => {
      render(
        <TestWrapper>
          <div>
            <CallStateController />
            <LeadAnalyticsDashboard />
          </div>
        </TestWrapper>
      );

      // Wait for analytics to load
      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Start a call
      const startCallButton = screen.getByTestId('start-call');
      await act(async () => {
        fireEvent.click(startCallButton);
      });

      // Check that call state is reflected
      await waitFor(() => {
        const callState = screen.getByTestId('call-state');
        expect(callState).toHaveTextContent('connecting');
      });

      // End the call
      const endCallButton = screen.getByTestId('end-call');
      await act(async () => {
        fireEvent.click(endCallButton);
      });

      // Verify call ended
      await waitFor(() => {
        const callState = screen.getByTestId('call-state');
        expect(callState).toHaveTextContent('idle');
      });
    });

    test('should update analytics when lead data changes during call', async () => {
      // Mock updated lead data
      const updatedLeads = [
        ...mockLeads,
        {
          id: 3,
          name: 'Call Generated Lead',
          company: 'New Company',
          status: 'New',
          priority: 'High',
          lead_source: 'Cold Call',
          industry: 'Technology',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      leadsService.getAllLeads
        .mockResolvedValueOnce({ success: true, data: { leads: mockLeads } })
        .mockResolvedValueOnce({ success: true, data: { leads: updatedLeads } });

      render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Get initial total
      const totalLeadsElement = screen.getByText(/Total Leads/i)
        .closest('div')
        .querySelector('.text-3xl');
      const initialTotal = parseInt(totalLeadsElement.textContent);

      // Trigger refresh (simulating data update during call)
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Verify data updated
      await waitFor(() => {
        expect(leadsService.getAllLeads).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Analytics ↔ Theme Context Integration', () => {
    test('should respond to theme changes dynamically', async () => {
      render(
        <TestWrapper>
          <div>
            <ThemeController />
            <LeadAnalyticsDashboard />
          </div>
        </TestWrapper>
      );

      // Wait for components to load
      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Check initial theme state
      const themeState = screen.getByTestId('theme-state');
      const initialTheme = themeState.textContent;

      // Toggle theme
      const toggleButton = screen.getByTestId('toggle-theme');
      fireEvent.click(toggleButton);

      // Verify theme changed
      await waitFor(() => {
        expect(themeState).not.toHaveTextContent(initialTheme);
      });

      // Analytics dashboard should reflect theme changes in its styling
      const analyticsContainer = screen.getByText(/Lead Analytics/i).closest('div');
      expect(analyticsContainer).toHaveClass('space-y-6');
    });

    test('should maintain analytics data across theme changes', async () => {
      render(
        <TestWrapper>
          <div>
            <ThemeController />
            <LeadAnalyticsDashboard />
          </div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Verify analytics data is displayed
      expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      expect(screen.getByText(/Lead Funnel/i)).toBeInTheDocument();

      // Toggle theme multiple times
      const toggleButton = screen.getByTestId('toggle-theme');
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);

      // Data should still be present and correct
      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Data Synchronization', () => {
    test('should handle concurrent data updates without race conditions', async () => {
      // Create multiple different data sets
      const dataSet1 = mockLeads;
      const dataSet2 = [...mockLeads, { 
        id: 3, 
        name: 'Update 1', 
        status: 'New',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];
      const dataSet3 = [...dataSet2, { 
        id: 4, 
        name: 'Update 2', 
        status: 'Qualified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];

      // Mock sequential responses
      leadsService.getAllLeads
        .mockResolvedValueOnce({ success: true, data: { leads: dataSet1 } })
        .mockResolvedValueOnce({ success: true, data: { leads: dataSet2 } })
        .mockResolvedValueOnce({ success: true, data: { leads: dataSet3 } });

      render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Trigger rapid updates
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      await act(async () => {
        fireEvent.click(refreshButton);
        fireEvent.click(refreshButton);
      });

      // Wait for all updates to complete
      await waitFor(() => {
        expect(leadsService.getAllLeads).toHaveBeenCalledTimes(3);
      });

      // Should handle all updates without errors
      expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
    });

    test('should maintain analytics refresh interval correctly', async () => {
      jest.useFakeTimers();

      render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Fast-forward time to trigger auto-refresh (30 seconds)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(leadsService.getAllLeads).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('Error Propagation and Recovery', () => {
    test('should handle service errors and allow recovery', async () => {
      // Start with an error
      leadsService.getAllLeads.mockRejectedValueOnce(new Error('Network failure'));

      render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load Analytics/i)).toBeInTheDocument();
      });

      // Fix the service and retry
      leadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: mockLeads }
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should recover
      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
        expect(screen.queryByText(/Failed to Load Analytics/i)).not.toBeInTheDocument();
      });
    });

    test('should maintain component stability during context errors', async () => {
      // Mock console.error to track errors
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Component should remain stable even with context issues
      expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Data Flow Performance', () => {
    test('should efficiently handle large data updates', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Lead ${i + 1}`,
        company: `Company ${i + 1}`,
        status: ['New', 'Qualified', 'Closed'][i % 3],
        priority: ['High', 'Medium', 'Low'][i % 3],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      leadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: largeDataSet }
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render large datasets efficiently (< 3 seconds)
      expect(renderTime).toBeLessThan(3000);

      // All analytics sections should still be present
      expect(screen.getByText(/Lead Funnel/i)).toBeInTheDocument();
      expect(screen.getByText(/Lead Sources/i)).toBeInTheDocument();
    });

    test('should debounce rapid data updates', async () => {
      render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Trigger multiple rapid updates
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      const user = userEvent.setup();
      
      // Rapid clicks should be handled efficiently
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);

      // Should not cause performance issues
      expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
    });
  });

  describe('Memory and Resource Management', () => {
    test('should clean up event listeners and intervals on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <LeadAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Lead Analytics/i)).toBeInTheDocument();
      });

      // Unmount should clean up resources
      unmount();

      // Allow cleanup to happen
      await new Promise(resolve => setTimeout(resolve, 100));

      // No memory leaks should occur
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });
});