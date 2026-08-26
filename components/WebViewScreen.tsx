import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { BrandedLoadingScreen } from '@/components/BrandedLoadingScreen';
import WebView from 'react-native-webview';
import { initiateGoogleLogin } from '@/services/googleAuth';
import {
  getExpoPushToken,
  sendPushTokenToWebView,
  useNotificationNavigation,
} from '@/services/notifications';
import { isValidBuildHubURL, isOAuthURL } from '@/utils/url';
import type { WebViewMessageEvent } from 'react-native-webview';

const BUILDHUBKH_URL = 'https://buildhubkh.com';

export function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle navigation from notifications
  const navigateToURL = useNotificationNavigation();

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
        // Handle Google login from web app
        const result = await initiateGoogleLogin();
        if (result.idToken && !result.error) {
          // Call Supabase auth directly via REST API
          webViewRef.current?.injectJavaScript(`
            (async function() {
              try {
                const SUPABASE_URL = 'https://onnnmkybphlmjwlwqbqv.supabase.co';
                const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubm5ta3licGhsbWp3bHdxYnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzM1MTgsImV4cCI6MjA5MjY0OTUxOH0.65ApGiv6oOYr-JgarWfJ5-viAGRI-ufOIH1g_vGfoVY';

                const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=id_token', {
                  method: 'POST',
                  headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    provider: 'google',
                    id_token: '${result.idToken}',
                  }),
                });

                const json = await res.json();

                if (!res.ok || json.error) {
                  console.error('Supabase sign-in error:', json);
                  window.location.href = '/login?error=' + encodeURIComponent(json.error_description || json.message || 'Google login failed');
                  return;
                }

                // Store session in localStorage so web app picks it up
                const session = {
                  access_token: json.access_token,
                  refresh_token: json.refresh_token,
                  expires_in: json.expires_in,
                  expires_at: json.expires_at,
                  token_type: json.token_type,
                  user: json.user,
                };
                localStorage.setItem('sb-onnnmkybphlmjwlwqbqv-auth-token', JSON.stringify(session));

                console.log('Google login success — redirecting to /home');
                window.location.href = '/home';
              } catch (e) {
                console.error('Login error:', e);
                window.location.href = '/login?error=google_login_failed';
              }
            })();
          `);
        } else {
          console.error('Google login failed:', result.error);
          webViewRef.current?.injectJavaScript(`
            window.location.href = '/login?error=' + encodeURIComponent('${result.error || 'Google login failed'}');
          `);
        }
      } else if (data.type === 'PUSH_TOKEN_REQUEST') {
        // Web app is requesting the Expo push token
        getExpoPushToken().then((token) => {
          if (token && webViewRef.current) {
            sendPushTokenToWebView(webViewRef, token);
          }
        });
      }
    } catch (err) {
      console.error('Error handling WebView message:', err);
    }
  };

  const handleNavigationStateChange = (navState: { canGoBack: boolean; url: string }) => {
    setCanGoBack(navState.canGoBack);

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
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
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
    console.error('WebView error:', error);
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
              <View style={styles.errorIconContent}>⚠️</View>
            </View>
            <View style={styles.errorText}>
              <View style={styles.errorTitle}>Connection Error</View>
              <View style={styles.errorMessage}>{error}</View>
            </View>
            <View
              style={styles.retryButton}
            >
              <View
                style={styles.retryButtonContent}
                onTouchEnd={handleRetry}
              >
                <View style={styles.retryButtonText}>Retry</View>
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
      <WebView
        ref={webViewRef}
        source={{ uri: BUILDHUBKH_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleWebViewMessage}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowFileAccess={false}
        mixedContentMode="never"
        cacheMode="LOAD_DEFAULT"
        decelerationRate="normal"
        scrollEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsBackForwardNavigationGestures
        // iOS specific
        useWebKit
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
