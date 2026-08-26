/**
 * List of allowed domains
 */
const ALLOWED_DOMAINS = [
  'buildhubkh.com',
  'www.buildhubkh.com',
  // Supabase auth/OAuth redirects
  'onnnmkybphlmjwlwqbqv.supabase.co',
  // Lovable OAuth broker (used by web app for Google login)
  'lovable.app',
  'lovable.cloud',
  'lovable.dev',
  'ai.gateway.lovable.dev',
  'connector-gateway.lovable.dev',
  // Google OAuth domains
  'accounts.google.com',
  'oauth2.googleapis.com',
  'google.com',
  'www.google.com',
  // Apple OAuth (if used)
  'appleid.apple.com',
];

/**
 * Check if URL is an OAuth/auth redirect (should not trigger "blocked" alert)
 */
export function isOAuthURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || '';
    const search = parsed.search || '';
    const hostname = parsed.hostname || '';
    return (
      pathname.includes('/auth/') ||
      pathname.includes('/oauth') ||
      pathname.includes('/callback') ||
      pathname.includes('/signin') ||
      search.includes('code=') ||
      search.includes('token=') ||
      search.includes('auth=') ||
      hostname.includes('supabase.co') ||
      hostname.includes('lovable.app') ||
      hostname.includes('lovable.cloud') ||
      hostname.includes('lovable.dev') ||
      hostname.includes('googleusercontent.com')
    );
  } catch {
    return false;
  }
}

/**
 * Validate if a URL is safe to navigate to
 */
export function isValidBuildHubURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname || '';

    // Check if hostname matches any allowed domain
    return ALLOWED_DOMAINS.some((domain) => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  } catch (error) {
    console.error('Invalid URL format:', url);
    return false;
  }
}

/**
 * Get the origin of BuildHubKH
 */
export function getBuildHubOrigin(): string {
  return 'https://buildhubkh.com';
}

/**
 * Check if URL is main BuildHubKH domain
 */
export function isBuildHubDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === 'buildhubkh.com' ||
      parsedUrl.hostname === 'www.buildhubkh.com'
    );
  } catch {
    return false;
  }
}

/**
 * Ensure URL is HTTPS only
 */
export function ensureHttps(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      console.warn('Forcing HTTPS for URL:', url);
      parsedUrl.protocol = 'https:';
    }
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

/**
 * Extract path from URL for deep linking
 */
export function extractPath(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
  } catch {
    return '/';
  }
}
