import { Platform } from 'react-native';
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
  redirectUrl: undefined,
};

/**
 * Resolve the OAuth redirect URI lazily and safely.
 *
 * The `auth.expo.io` proxy was deprecated and removed in recent Expo SDKs, so
 * we use the app's own custom scheme instead. This scheme is registered in
 * app.json (`scheme: "buildhubkh"` + the Android intent filter), so the system
 * browser can redirect back into the app after Google auth completes.
 *
 * IMPORTANT: this exact redirect URI must be registered on the Google OAuth
 * client (Android "Android" type / iOS "iOS" type clients accept custom
 * schemes; "Web application" clients do NOT).
 */
function resolveRedirectUrl(): string {
  return 'buildhubkh://oauth/google/callback';
}

/**
 * Set custom Google OAuth configuration
 */
export function setGoogleAuthConfig(config: GoogleAuthConfig) {
  googleConfig = { ...googleConfig, ...config };
}

/**
 * Generate PKCE code_verifier (128 chars of random URL-safe characters)
 */
function generateCodeVerifier() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from({ length: 128 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

/**
 * Generate PKCE code_challenge = base64url(sha256(code_verifier))
 * Uses Web Crypto API, which works in React Native
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashString = String.fromCharCode(...hashArray);
    return btoa(hashString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch {
    // Fallback if crypto.subtle is unavailable
    return verifier;
  }
}

/**
 * Initiate Google login flow
 * Uses system browser for OAuth to work reliably with WebView cookie sharing
 */
export async function initiateGoogleLogin(): Promise<GoogleAuthResult> {
  try {
    // Use platform-specific client ID
    const isIOS = Platform.OS === 'ios';
    const clientId = isIOS
      ? googleConfig.clientIdIOS
      : googleConfig.clientIdAndroid;

    if (!clientId) {
      return {
        error: `Google Client ID not configured for ${isIOS ? 'iOS' : 'Android'}`,
      };
    }

    const redirectUrl = googleConfig.redirectUrl || resolveRedirectUrl();
    if (!redirectUrl) {
      return {
        error: 'Redirect URL not configured',
      };
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Build OAuth authorization URL
    const authUrl = new URL(GOOGLE_OAUTH_ENDPOINT);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

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

    // Build token exchange body
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUrl,
      code_verifier: codeVerifier,
    });

    // Android OAuth clients may have a client_secret; iOS clients do not
    if (!isIOS && googleConfig.clientIdAndroid) {
      // Note: if your Android client ID is a "Web application" type,
      // add its client_secret here. For "Installed" / "Android" types,
      // leave it out.
      // tokenBody.append('client_secret', 'YOUR_ANDROID_CLIENT_SECRET_HERE');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[Google OAuth] token exchange error:', errorData);
      return {
        error: errorData.error_description || errorData.error || 'Token exchange failed',
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
