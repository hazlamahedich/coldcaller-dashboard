import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import { MakeCalls, ManageLeads, Analytics, Settings } from './pages';

// Import Layout and ErrorBoundary
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Import contexts
import { 
  AuthProvider,
  ThemeProvider, 
  SettingsProvider, 
  LeadProvider, 
  CallProvider 
} from './contexts';

// Import phone detection fix styles
import './styles/phone-detection-fix.css';

// Main App Component with React Router
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SettingsProvider>
          <LeadProvider>
            <CallProvider>
              <ErrorBoundary>
                <Router>
                  <Routes>
                    {/* Protected Routes */}
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout>
                          <MakeCalls />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/leads" element={
                      <ProtectedRoute>
                        <Layout>
                          <ManageLeads />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                      <ProtectedRoute>
                        <Layout>
                          <Analytics />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Layout>
                          <Settings />
                        </Layout>
                      </ProtectedRoute>
                    } />
                  </Routes>
                </Router>
              </ErrorBoundary>
            </CallProvider>
          </LeadProvider>
        </SettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

// All styles now converted to Tailwind CSS classes!

export default App;
