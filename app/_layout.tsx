import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, StatusBar } from 'react-native';
import { WebViewScreen } from '@/components/WebViewScreen';
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
      <StatusBar backgroundColor="#174E95" barStyle="light-content" />
      <View style={styles.container}>
        <WebViewScreen />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
