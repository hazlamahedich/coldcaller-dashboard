/**
 * Context Providers Export
 * Centralized export for all application contexts
 */

// Export all context providers and hooks
export { AuthProvider, useAuth } from './AuthContext';
export { ThemeProvider, useTheme } from './ThemeContext';
export { SettingsProvider, useSettings } from './SettingsContext';
export { LeadProvider, useLead } from './LeadContext';
export { CallProvider, useCall } from './CallContext';

// Export default contexts for direct access if needed
export { default as AuthContext } from './AuthContext';
export { default as ThemeContext } from './ThemeContext';
export { default as SettingsContext } from './SettingsContext';
export { default as LeadContext } from './LeadContext';
export { default as CallContext } from './CallContext';