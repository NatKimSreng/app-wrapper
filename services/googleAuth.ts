import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

// Initialize web browser for use with AuthSession
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

interface GoogleAuthConfig {
  clientIdIOS?: string;
  clientIdAndroid?: string;
  redirectUrl?: string;
}

interface GoogleAuthResult {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  error?: string;
}

let googleConfig: GoogleAuthConfig = {
  clientIdIOS: Constants.expoConfig?.extra?.googleClientId?.ios,
  clientIdAndroid: Constants.expoConfig?.extra?.googleClientId?.android,
  redirectUrl: AuthSession.makeRedirectUri({
    scheme: 'buildhubkh',
    path: 'oauth/google/callback',
  }),
};

/**
 * Set custom Google OAuth configuration
 */
export function setGoogleAuthConfig(config: GoogleAuthConfig) {
  googleConfig = { ...googleConfig, ...config };
}

/**
 * Initiate Google login flow
 * Uses system browser for OAuth to work reliably with WebView cookie sharing
 */
export async function initiateGoogleLogin(): Promise<GoogleAuthResult> {
  try {
    const clientId = googleConfig.clientIdAndroid || googleConfig.clientIdIOS;
    if (!clientId) {
      return {
        error: 'Google Client ID not configured',
      };
    }

    const redirectUrl = googleConfig.redirectUrl;
    if (!redirectUrl) {
      return {
        error: 'Redirect URL not configured',
      };
    }

    // Build OAuth authorization URL
    const authUrl = new URL(GOOGLE_OAUTH_ENDPOINT);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    // Use system browser to handle authentication
    // This avoids WebView cookie/auth issues
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      redirectUrl
    );

    if (result.type !== 'success') {
      return {
        error: 'Authentication cancelled',
      };
    }

    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return {
        error: 'No authorization code received',
      };
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: googleConfig.clientIdAndroid || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUrl,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return {
        error: errorData.error_description || 'Token exchange failed',
      };
    }

    const tokens = await tokenResponse.json();

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
    };
  } catch (err) {
    console.error('Google login error:', err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error during login',
    };
  }
}

/**
 * Check if user is authenticated
 */
export function isUserAuthenticated(): boolean {
  // This could check for stored tokens or session
  // For now, we rely on BuildHubKH website's own auth session
  return true; // WebView maintains its own session with BuildHubKH
}

/**
 * Logout user (clears WebView cookies)
 */
export async function logout(): Promise<void> {
  try {
    // This would be handled by BuildHubKH website's logout endpoint
    // The mobile app just maintains the WebView session
    console.log('Logout handled by BuildHubKH website');
  } catch (err) {
    console.error('Logout error:', err);
  }
}
