import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LinkPreviewContextProvider } from 'expo-router/build/link/preview/LinkPreviewContext';
import * as Notifications from 'expo-notifications';
import { initializeNotifications } from '@/services/notifications';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  React.useEffect(() => {
    // Initialize notifications
    const unsubscribe = initializeNotifications();
    
    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <LinkPreviewContextProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </LinkPreviewContextProvider>
    </SafeAreaProvider>
  );
}
