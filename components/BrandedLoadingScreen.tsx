import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
} from 'react-native';

/**
 * Branded loading screen matching BuildHubKH app icon colors:
 * - Background: #2c5282 (deep navy blue)
 * - Logo: yellow hard-hat on white location pin
 */
export function BrandedLoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.brandName}>BuildHubKH</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#23517c',
    zIndex: 100,
  },
  logo: {
    width: 160,
    height: 160,
  },
  brandName: {
    marginTop: 20,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
