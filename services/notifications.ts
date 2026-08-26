import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { isValidBuildHubURL } from '@/utils/url';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'https://api.buildhubkh.com';

let lastNotificationURL: string | null = null;

/**
 * Get or create Expo push token
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications not available on simulator');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
      console.log('EAS Project ID not configured, skipping push token');
      return null;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      console.log('Invalid EAS Project ID format, skipping push token');
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log('Expo push token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Send push token to backend via WebView postMessage
 * The web app will store it in device_tokens table
 */
export function sendPushTokenToWebView(webViewRef: any, token: string): void {
  try {
    const payload = JSON.stringify({
      type: 'EXPO_PUSH_TOKEN',
      payload: {
        token,
        platform: Device.osName || 'unknown',
      },
    });

    webViewRef.current?.injectJavaScript(`
      (function() {
        window.dispatchEvent(new MessageEvent('message', {
          data: ${payload}
        }));
        // Also try to call a global handler if the web app expects it
        if (window.handleExpoPushToken) {
          window.handleExpoPushToken(${payload});
        }
      })();
    `);

    console.log('Push token sent to web app');
  } catch (error) {
    console.error('Error sending push token to web app:', error);
  }
}

/**
 * Handle notification response (when user taps notification)
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<string | null> {
  const data = response.notification.request.content.data as Record<string, unknown>;

  if (data?.url && typeof data.url === 'string' && isValidBuildHubURL(data.url)) {
    lastNotificationURL = data.url;
    return data.url;
  }

  return null;
}

/**
 * Get last notification URL for deep linking
 */
export function getLastNotificationURL(): string | null {
  const url = lastNotificationURL;
  lastNotificationURL = null; // clear after reading
  return url;
}

/**
 * Hook: listen for notification URL changes
 */
export function useNotificationNavigation(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response).then((navUrl) => {
          if (navUrl) setUrl(navUrl);
        });
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return url;
}

/**
 * Initialize notifications
 * Sets up listeners and requests permissions
 */
export function initializeNotifications(): (() => void) | undefined {
  try {
    // Foreground notification handler
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
      }
    );

    // Response handler (tap on notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        handleNotificationResponse(response);
      }
    );

    return () => {
      foregroundSubscription?.remove();
      responseSubscription?.remove();
    };
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return undefined;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}
