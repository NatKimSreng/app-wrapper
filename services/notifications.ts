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
    // Check if device is real (not simulator)
    if (!Device.isDevice) {
      console.log('Push notifications not available on simulator');
      return null;
    }

    // Check notification permissions
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

    // Get the token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
      console.log('EAS Project ID not configured, skipping push token');
      return null;
    }

    // Validate projectId format (UUID)
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
 * Send push token to backend
 */
export async function sendPushTokenToBackend(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mobile/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: Device.osName,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send push token to backend');
      return false;
    }

    console.log('Push token sent to backend successfully');
    return true;
  } catch (error) {
    console.error('Error sending push token to backend:', error);
    return false;
  }
}

/**
 * Handle notification response (when user taps notification)
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<string | null> {
  const data = response.notification.request.content.data;

  if (data?.url && isValidBuildHubURL(data.url)) {
    lastNotificationURL = data.url;
    return data.url;
  }

  return null;
}

/**
 * Initialize notifications
 * Sets up listeners and requests permissions
 */
export function initializeNotifications(): (() => void) | undefined {
  try {
    // Get and send push token on app start
    getExpoPushToken().then((token) => {
      if (token) {
        // Store locally
        try {
          localStorage?.setItem('expo_push_token', token);
        } catch (e) {
          console.log('localStorage not available');
        }

        // Send to backend
        sendPushTokenToBackend(token);
      }
    });

    // Listen for notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      
      // Handle the notification in foreground
      const data = notification.request.content.data;
      if (data?.url && isValidBuildHubURL(data.url)) {
        lastNotificationURL = data.url;
      }
    });

    // Listen for notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

/**
 * Hook to get last notification URL for navigation
 */
export function useNotificationNavigation(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (lastNotificationURL) {
      const tempURL = lastNotificationURL;
      lastNotificationURL = null; // Reset after reading
      setUrl(tempURL);
    }
  }, []);

  return url;
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
