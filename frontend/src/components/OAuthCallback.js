import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { themeClasses } = useTheme();
  
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
          setStatus('error');
          setError(errorDescription || error);
          setMessage(`OAuth error: ${errorDescription || error}`);
          return;
        }

        // Validate state parameter (should start with 'coldcaller_')
        if (!state || !state.startsWith('coldcaller_')) {
          setStatus('error');
          setError('Invalid state parameter');
          setMessage('Invalid OAuth state - possible security issue');
          return;
        }

        // Extract authorization code
        if (!code) {
          setStatus('error');
          setError('Missing authorization code');
          setMessage('No authorization code received from OAuth provider');
          return;
        }

        // Determine OAuth provider from state or URL
        const provider = detectOAuthProvider();
        if (!provider) {
          setStatus('error');
          setError('Unknown OAuth provider');
          setMessage('Could not determine OAuth provider from callback');
          return;
        }

        setMessage(`Processing ${provider.name} OAuth callback...`);

        // Exchange authorization code for access token
        const tokenData = await exchangeCodeForTokens(provider.id, code, state);
        
        if (!tokenData.access_token) {
          throw new Error('No access token received');
        }

        // Get user information
        const userInfo = await getUserInfo(provider.id, tokenData.access_token);

        // Update settings with OAuth tokens and user info
        const oauthConfig = {
          connected: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
          tokenType: tokenData.token_type || 'Bearer',
          scope: tokenData.scope,
          connectedAt: new Date().toISOString(),
          userEmail: userInfo.email,
          displayName: userInfo.name,
          userId: userInfo.id,
          pictureUrl: userInfo.picture
        };

        updateSetting('oauth', provider.id, oauthConfig);

        setStatus('success');
        setMessage(`Successfully connected to ${provider.name}!`);

        // Redirect back to integrations page after a short delay
        setTimeout(() => {
          navigate('/settings/integrations');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback processing error:', error);
        setStatus('error');
        setError(error.message);
        setMessage(`Failed to process OAuth callback: ${error.message}`);
      }
    };

    processOAuthCallback();
  }, [searchParams, navigate, updateSetting]);

  const detectOAuthProvider = () => {
    const referrer = document.referrer;
    const state = searchParams.get('state');

    // Check referrer URL to determine provider
    if (referrer.includes('accounts.google.com') || referrer.includes('google.com')) {
      return { id: 'google', name: 'Google' };
    }
    
    if (referrer.includes('login.microsoftonline.com') || referrer.includes('microsoft.com')) {
      return { id: 'microsoft', name: 'Microsoft' };
    }

    // Fallback to state parameter if available
    if (state) {
      const parts = state.split('_');
      if (parts.length > 1) {
        const provider = parts[1];
        if (provider === 'google') return { id: 'google', name: 'Google' };
        if (provider === 'microsoft') return { id: 'microsoft', name: 'Microsoft' };
      }
    }

    return null;
  };

  const exchangeCodeForTokens = async (providerId, code, state) => {
    // In a real implementation, this should be handled by your backend
    // for security reasons (client secret should not be exposed)
    const oauthConfig = settings.oauth?.[providerId];
    
    if (!oauthConfig) {
      throw new Error(`OAuth configuration not found for ${providerId}`);
    }

    const tokenEndpoints = {
      google: 'https://oauth2.googleapis.com/token',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    };

    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      code: code,
      redirect_uri: oauthConfig.redirectUri,
      state: state
    });

    const response = await fetch(tokenEndpoints[providerId], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
    }

    const tokenData = await response.json();
    
    if (tokenData.error) {
      throw new Error(`Token exchange error: ${tokenData.error_description || tokenData.error}`);
    }

    return tokenData;
  };

  const getUserInfo = async (providerId, accessToken) => {
    const userInfoEndpoints = {
      google: 'https://www.googleapis.com/oauth2/v2/userinfo',
      microsoft: 'https://graph.microsoft.com/v1.0/me'
    };

    const response = await fetch(userInfoEndpoints[providerId], {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    const userInfo = await response.json();

    // Normalize user info structure
    return {
      id: userInfo.id,
      email: userInfo.email || userInfo.userPrincipalName || userInfo.mail,
      name: userInfo.name || userInfo.displayName,
      picture: userInfo.picture || userInfo.photo?.thumbnailUrl
    };
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    navigate('/settings/integrations');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`max-w-md w-full ${themeClasses.cardBg} rounded-lg shadow-lg p-6 text-center`}>
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>
              Processing OAuth
            </h2>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>
              OAuth Success!
            </h2>
            <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
              {message}
            </p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>
              Redirecting to integrations page...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>
              OAuth Error
            </h2>
            <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
              {message}
            </p>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <div className="space-x-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleGoBack}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  themeClasses.border
                } hover:bg-gray-50 dark:hover:bg-gray-700`}
              >
                Go Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;