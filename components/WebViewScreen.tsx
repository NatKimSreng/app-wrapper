import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  BackHandler,
  Linking,
} from 'react-native';
import { BrandedLoadingScreen } from '@/components/BrandedLoadingScreen';
import WebView from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { initiateGoogleLogin } from '@/services/googleAuth';
import {
  getExpoPushToken,
  sendPushTokenToWebView,
  useNotificationNavigation,
} from '@/services/notifications';
import { isValidBuildHubURL, isOAuthURL } from '@/utils/url';

// react-native-webview@13.17.0's index.d.ts declares WebView with a default
// generic `P = undefined`, which collapses `WebViewProps & undefined` to
// `never` and breaks JSX typing. Cast to a concrete component type.
const TypedWebView = WebView as unknown as React.ForwardRefExoticComponent<
  WebViewProps & React.RefAttributes<WebViewHandle>
>;

interface WebViewHandle {
  goBack: () => void;
  reload: () => void;
  injectJavaScript: (script: string) => void;
}

const BUILDHUBKH_URL = 'https://buildhubkh.com';

// Supabase project ref (matches the web app's SUPABASE_URL). The session is
// stored in the WebView's localStorage under this key.
const SUPABASE_PROJECT_REF = 'onnnmkybphlmjwlwqbqv';
const SUPABASE_AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

export function WebViewScreen() {
  const webViewRef = useRef<WebViewHandle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether we've already shown real content. Once the WebView has
  // navigated to a real URL, we must NEVER re-show the loading overlay —
  // otherwise redirects (buildhubkh.com -> www -> Cloudflare challenge) keep
  // firing onLoadStart and re-covering the page with the spinner forever.
  const hasLoadedOnce = useRef(false);

  // Handle navigation from notifications
  const navigateToURL = useNotificationNavigation();

  // Inject a Supabase session (from a Google login deep link) into the WebView
  // and reload so the web app picks it up.
  const handleAuthCallback = (url: string) => {
    if (!url.startsWith('buildhubkh://auth/callback')) return;
    try {
      const query = url.slice(url.indexOf('?') + 1);
      const sessionEncoded = new URLSearchParams(query).get('session');
      if (!sessionEncoded) return;
      const session = JSON.parse(decodeURIComponent(sessionEncoded));
      const sessionStr = JSON.stringify(session);
      webViewRef.current?.injectJavaScript(`
        (function() {
          try {
            localStorage.setItem('${SUPABASE_AUTH_STORAGE_KEY}', ${JSON.stringify(sessionStr)});
            window.location.reload();
          } catch (e) {
            console.error('[auth] session inject failed', e);
          }
        })();
      `);
    } catch (e) {
      console.error('[auth] handleAuthCallback error', e);
    }
  };

  // Listen for the deep-link redirect back from the system browser after a
  // Google login, and handle cold starts (app launched via the deep link).
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthCallback(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthCallback(url);
    });
    return () => sub.remove();
  }, []);

  // Fallback: never let the loading screen get stuck forever.
  // If the page hasn't loaded within 8s, force-hide the spinner so the
  // WebView (or whatever it has rendered) is always visible.
  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Handle Android back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      // Exit app if no history
      return false;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  // Handle notification navigation
  useEffect(() => {
    if (navigateToURL) {
      if (isValidBuildHubURL(navigateToURL)) {
        webViewRef.current?.injectJavaScript(`
          window.location.href = '${navigateToURL}';
        `);
      }
    }
  }, [navigateToURL]);

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'GOOGLE_LOGIN') {
        // Handle Google login from web app.
        // The web app (nativeGoogleLogin.ts) sends GOOGLE_LOGIN and then waits
        // for a GOOGLE_LOGIN_SUCCESS message containing the idToken, so it can
        // call supabase.auth.signInWithIdToken() itself. We must reply with that
        // message — the old code never did, so the web app hung forever.
        const result = await initiateGoogleLogin();
        if (result.idToken && !result.error) {
          const payload = JSON.stringify({
            type: 'GOOGLE_LOGIN_SUCCESS',
            payload: { idToken: result.idToken },
          });
          webViewRef.current?.injectJavaScript(`
            (function() {
              window.dispatchEvent(new MessageEvent('message', { data: ${payload} }));
            })();
          `);
        } else {
          const err = result.error || 'Google login failed';
          const payload = JSON.stringify({
            type: 'GOOGLE_LOGIN_ERROR',
            payload: { error: err },
          });
          webViewRef.current?.injectJavaScript(`
            (function() {
              window.dispatchEvent(new MessageEvent('message', { data: ${payload} }));
            })();
          `);
        }
      } else if (data.type === 'PUSH_TOKEN_REQUEST') {
        // Web app is requesting the Expo push token
        getExpoPushToken().then((token) => {
          if (token && webViewRef.current) {
            sendPushTokenToWebView(webViewRef, token);
          }
        });
      } else if (data.type === 'GOOGLE_LOGIN_WEB') {
        // Web app wants us to open its login page in the system browser
        // (Google blocks OAuth inside the WebView). The session comes back via
        // the buildhubkh://auth/callback deep link handled above.
        const loginUrl = data.payload?.url;
        if (loginUrl) {
          WebBrowser.openBrowserAsync(loginUrl).catch((err) =>
            console.error('[auth] openBrowserAsync failed', err)
          );
        }
      }
    } catch (err) {
      console.error('Error handling WebView message:', err);
    }
  };

  const handleNavigationStateChange = (navState: { canGoBack: boolean; url: string }) => {
    setCanGoBack(navState.canGoBack);
    console.log('[WebView] navigation state:', navState.url);

    // Ignore the initial blank/empty URL — the WebView fires this before the
    // real page loads, and blocking it prevents the site from ever rendering.
    if (!navState.url || navState.url === 'about:blank') {
      return;
    }

    // As soon as we navigate to a real URL, hide the loading overlay. This is
    // critical: if Cloudflare serves a "verify you are human" challenge, that
    // page must be visible (and tappable) — otherwise it sits hidden behind
    // the branded loading screen and the user can never complete it.
    hasLoadedOnce.current = true;
    setIsLoading(false);

    // Re-send the push token on every navigation. The web app only attaches
    // its EXPO_PUSH_TOKEN listener AFTER login, so the token sent at initial
    // page load is lost. Re-sending here ensures the token reaches the web app
    // once the user is logged in and the listener exists.
    getExpoPushToken().then((token) => {
      if (token && webViewRef.current) {
        sendPushTokenToWebView(webViewRef, token);
      }
    });

    // Intercept Lovable OAuth and force native Google login instead
    if (navState.url.includes('oauth.lovable.app') && navState.url.includes('provider=google')) {
      console.log('Intercepted Lovable OAuth — triggering native Google login');
      // Go back to prevent navigation
      webViewRef.current?.goBack();
      // Trigger native login
      handleWebViewMessage({
        nativeEvent: { data: JSON.stringify({ type: 'GOOGLE_LOGIN' }) }
      } as WebViewMessageEvent);
      return;
    }

    // Validate URL to prevent navigation outside BuildHubKH
    // Allow OAuth/auth redirects to pass through
    if (!isValidBuildHubURL(navState.url) && !isOAuthURL(navState.url)) {
      console.warn('Blocked navigation to:', navState.url);
      webViewRef.current?.goBack();
    }
  };

  const handleLoadStart = () => {
    console.log('[WebView] load start');
    // Only show the loading screen on the very first load. During redirects
    // (buildhubkh.com -> www -> Cloudflare), onLoadStart fires repeatedly and
    // would otherwise keep re-covering the page with the spinner forever.
    if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }
    setError(null);
  };

  const handleLoadProgress = (progress: number) => {
    console.log('[WebView] load progress:', progress);
    // Once the page is ~90% loaded it's already rendering — hide the spinner
    // early so the branded screen doesn't linger even if onLoadEnd is delayed.
    if (progress > 0.9) {
      setIsLoading(false);
    }
  };

  const handleLoadEnd = () => {
    console.log('[WebView] load end');
    setIsLoading(false);

    // Send push token to web app when it loads
    getExpoPushToken().then((token) => {
      if (token && webViewRef.current) {
        sendPushTokenToWebView(webViewRef, token);
      }
    });
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setError('Unable to load BuildHubKH. Please check your connection and try again.');
    console.error('[WebView] error:', JSON.stringify(error));
  };

  const handleRetry = () => {
    setError(null);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconContent}>⚠️</Text>
            </View>
            <View style={styles.errorText}>
              <Text style={styles.errorTitle}>Connection Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
            <View
              style={styles.retryButton}
            >
              <View
                style={styles.retryButtonContent}
                onTouchEnd={handleRetry}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && <BrandedLoadingScreen />}
      <TypedWebView
        ref={webViewRef}
        source={{ uri: BUILDHUBKH_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onLoadStart={handleLoadStart}
        onLoadProgress={({ nativeEvent }) => handleLoadProgress(nativeEvent.progress)}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleWebViewMessage}
        // Use a real browser User-Agent so Cloudflare (which serves
        // buildhubkh.com) doesn't treat the WebView as a bot and serve a
        // blank/blocked page.
        userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        originWhitelist={['*']}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowFileAccess={false}
        mixedContentMode="always"
        cacheMode="LOAD_DEFAULT"
        decelerationRate={0.998}
        scrollEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsBackForwardNavigationGestures
        // iOS specific
        limitsNavigationsToAppBoundDomains
        // Android specific
        nestedScrollEnabled
        overScrollMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorIconContent: {
    fontSize: 48,
  },
  errorText: {
    marginBottom: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    width: '100%',
  },
  retryButtonContent: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
