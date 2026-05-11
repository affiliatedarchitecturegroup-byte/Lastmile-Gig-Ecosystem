/**
 * Driver Mobile App - Root Layout (Expo Router v3)
 *
 * Root layout component for the driver mobile app.
 * Configures navigation stack, auth provider, and theme.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @see POLYGLOT_ARCHITECTURE.md - Section 3.3
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

/**
 * App theme colors matching Lastmile Gig design tokens.
 */
export const THEME = {
  colors: {
    primary: '#0066FF',
    primaryDark: '#0052CC',
    secondary: '#00C853',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    textSecondary: '#64748B',
    error: '#DC2626',
    warning: '#F59E0B',
    success: '#10B981',
    border: '#E2E8F0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
} as const;

export default function RootLayout(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: THEME.colors.surface },
          headerTintColor: THEME.colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: THEME.colors.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="delivery/[id]"
          options={{ title: 'Active Delivery', presentation: 'modal' }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
