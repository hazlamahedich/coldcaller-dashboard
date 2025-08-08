/**
 * Error Boundary Component
 * Catches and handles JavaScript errors in React components
 * Provides fallback UI when components crash
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and update state with error details
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // In a real application, you would also log this to an error reporting service
    // like Sentry, LogRocket, or Bugsnag
    if (process.env.NODE_ENV === 'production') {
      console.log('📊 Error would be reported to error tracking service in production');
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <span className="text-2xl">🚨</span>
            </div>
            
            {/* Error Title */}
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            {/* Error Message */}
            <p className="text-gray-600 mb-6">
              The application encountered an unexpected error. 
              Please try refreshing the page.
            </p>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🔄 Refresh Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🔄 Try Again
              </button>
            </div>
            
            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  🔍 Developer Details (click to expand)
                </summary>
                <div className="mt-3 p-3 bg-red-50 rounded-md text-xs">
                  <div className="font-bold text-red-800 mb-2">Error:</div>
                  <div className="text-red-700 mb-3 font-mono">
                    {this.state.error.toString()}
                  </div>
                  
                  {this.state.errorInfo && (
                    <>
                      <div className="font-bold text-red-800 mb-2">Stack Trace:</div>
                      <div className="text-red-700 whitespace-pre-wrap font-mono text-xs">
                        {this.state.errorInfo.componentStack}
                      </div>
                    </>
                  )}
                </div>
              </details>
            )}
            
            {/* Help Text */}
            <div className="mt-6 text-xs text-gray-500">
              If the problem persists, please check the browser console for more details.
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;