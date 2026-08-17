import React from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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

function AppContent() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Blue status bar background */}
      <View style={[styles.statusBar, { height: insets.top }]} />
      <StatusBar barStyle="light-content" />
      
      {/* WebView fills rest of screen */}
      <WebViewScreen />
    </View>
  );
}

export default function RootLayout() {
  React.useEffect(() => {
    const unsubscribe = initializeNotifications();
    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    backgroundColor: '#174E95',
    width: '100%',
  },
});
