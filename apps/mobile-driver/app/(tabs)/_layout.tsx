/**
 * Driver App - Tab Layout
 *
 * Bottom tab navigation for the main driver app experience.
 * Tabs: Dashboard, Deliveries, Earnings, Profile
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../_layout';

function TabIcon({ name, focused }: { name: string; focused: boolean }): React.JSX.Element {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>{name}</Text>
    </View>
  );
}

export default function TabLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          height: 80,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerStyle: { backgroundColor: THEME.colors.surface },
        headerTintColor: THEME.colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Deliveries',
          tabBarIcon: ({ focused }) => <TabIcon name="box" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ focused }) => <TabIcon name="wallet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20, color: THEME.colors.textSecondary },
  iconFocused: { color: THEME.colors.primary },
});
