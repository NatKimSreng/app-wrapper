import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { initiateGoogleLogin } from '@/services/googleAuth';
import { useNotificationNavigation } from '@/services/notifications';
import { isValidBuildHubURL } from '@/utils/url';
import type { WebViewMessageEvent } from 'react-native-webview';

const BUILDHUBKH_URL = 'https://buildhubkh.com';

export function WebViewScreen() {
  const insets = useSafeAreaInsets();
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
        if (result.accessToken) {
          // Send token back to web app
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('googleLoginSuccess', {
              detail: { accessToken: '${result.accessToken}', idToken: '${result.idToken}' }
            }));
          `);
        }
      } else if (data.type === 'PUSH_TOKEN_REQUEST') {
        // Push token is handled by notifications service
        // This is just a message from the web app acknowledging it received the token
        console.log('Web app received push token:', data.payload);
      }
    } catch (err) {
      console.error('Error handling WebView message:', err);
    }
  };

  const handleNavigationStateChange = (navState: { canGoBack: boolean; url: string }) => {
    setCanGoBack(navState.canGoBack);

    // Validate URL to prevent navigation outside BuildHubKH
    if (!isValidBuildHubURL(navState.url)) {
      Alert.alert('Blocked', 'You can only navigate within buildhubkh.com');
      webViewRef.current?.goBack();
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);

    // Inject push token into web app if available
    webViewRef.current?.injectJavaScript(`
      (async () => {
        const token = localStorage.getItem('expo_push_token');
        if (token) {
          window.dispatchEvent(new CustomEvent('expoPushToken', { detail: { token } }));
        }
      })();
    `);
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
              style={[
                styles.retryButton,
                {
                  paddingBottom: insets.bottom,
                },
              ]}
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      )}
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
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 100,
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
