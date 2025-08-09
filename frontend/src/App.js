import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import { MakeCalls, ManageLeads, Analytics, Settings } from './pages';

// Import Layout and ErrorBoundary
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Import contexts
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { LeadProvider } from './contexts/LeadContext';
import { CallProvider } from './contexts/CallContext';

// Import phone detection fix styles
import './styles/phone-detection-fix.css';

// Main App Component with React Router
function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <LeadProvider>
          <CallProvider>
            <ErrorBoundary>
              <Router>
                <Layout>
                  <Routes>
                    <Route path="/" element={<MakeCalls />} />
                    <Route path="/leads" element={<ManageLeads />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </Router>
            </ErrorBoundary>
          </CallProvider>
        </LeadProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

// All styles now converted to Tailwind CSS classes!

export default App;
