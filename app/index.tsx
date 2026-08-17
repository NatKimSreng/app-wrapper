import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebViewScreen } from '@/components/WebViewScreen';

export default function Home() {
  return (
    <View style={styles.container}>
      <WebViewScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
