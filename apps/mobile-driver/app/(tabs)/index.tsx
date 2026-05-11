/**
 * Driver Dashboard Screen
 *
 * Main dashboard showing earnings summary, active delivery card,
 * performance tier, and quick actions.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P123
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { THEME } from '../_layout';

interface DashboardData {
  todayEarnings: number;
  weekEarnings: number;
  deliveriesCompleted: number;
  performanceScore: number;
  tier: string;
  activeDelivery: ActiveDelivery | null;
  isOnline: boolean;
}

interface ActiveDelivery {
  id: string;
  restaurantName: string;
  customerAddress: string;
  estimatedTime: number;
  status: string;
}

export default function DashboardScreen(): React.JSX.Element {
  const [data, setData] = useState<DashboardData>({
    todayEarnings: 485.50,
    weekEarnings: 3245.00,
    deliveriesCompleted: 12,
    performanceScore: 87,
    tier: 'Gold',
    activeDelivery: null,
    isOnline: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    // In production: fetch from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const toggleOnline = (): void => {
    setData((prev) => ({ ...prev, isOnline: !prev.isOnline }));
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Online Toggle */}
      <TouchableOpacity
        style={[styles.onlineToggle, data.isOnline && styles.onlineToggleActive]}
        onPress={toggleOnline}
      >
        <Text style={[styles.onlineText, data.isOnline && styles.onlineTextActive]}>
          {data.isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </TouchableOpacity>

      {/* Earnings Summary */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Today</Text>
        <Text style={styles.earningsAmount}>R {data.todayEarnings.toFixed(2)}</Text>
        <View style={styles.earningsRow}>
          <View style={styles.earningsStat}>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>R {data.weekEarnings.toFixed(2)}</Text>
          </View>
          <View style={styles.earningsStat}>
            <Text style={styles.statLabel}>Deliveries</Text>
            <Text style={styles.statValue}>{data.deliveriesCompleted}</Text>
          </View>
        </View>
      </View>

      {/* Performance Tier */}
      <View style={styles.performanceCard}>
        <View style={styles.performanceHeader}>
          <Text style={styles.performanceTitle}>Performance</Text>
          <Text style={styles.tierBadge}>{data.tier}</Text>
        </View>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreBarFill, { width: `${data.performanceScore}%` }]} />
        </View>
        <Text style={styles.scoreText}>{data.performanceScore}/100</Text>
      </View>

      {/* Active Delivery */}
      {data.activeDelivery && (
        <View style={styles.activeDeliveryCard}>
          <Text style={styles.activeLabel}>Active Delivery</Text>
          <Text style={styles.restaurantName}>{data.activeDelivery.restaurantName}</Text>
          <Text style={styles.deliveryAddress}>{data.activeDelivery.customerAddress}</Text>
          <Text style={styles.estimatedTime}>
            ETA: {data.activeDelivery.estimatedTime} min
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>View Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Earnings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: THEME.spacing.md, backgroundColor: THEME.colors.background },
  onlineToggle: {
    backgroundColor: THEME.colors.border, borderRadius: THEME.borderRadius.full,
    padding: THEME.spacing.md, alignItems: 'center', marginBottom: THEME.spacing.md,
  },
  onlineToggleActive: { backgroundColor: THEME.colors.success },
  onlineText: { fontSize: 18, fontWeight: '700', color: THEME.colors.textSecondary },
  onlineTextActive: { color: '#FFFFFF' },
  earningsCard: {
    backgroundColor: THEME.colors.primary, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg, marginBottom: THEME.spacing.md,
  },
  earningsLabel: { color: '#FFFFFFAA', fontSize: 14 },
  earningsAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', marginVertical: THEME.spacing.xs },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: THEME.spacing.sm },
  earningsStat: { alignItems: 'center' },
  statLabel: { color: '#FFFFFFAA', fontSize: 12 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  performanceCard: {
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md, marginBottom: THEME.spacing.md,
  },
  performanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  performanceTitle: { fontSize: 16, fontWeight: '600', color: THEME.colors.text },
  tierBadge: {
    backgroundColor: '#FCD34D', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: THEME.borderRadius.full, fontWeight: '600', fontSize: 12,
  },
  scoreBar: {
    height: 8, backgroundColor: THEME.colors.border, borderRadius: 4,
    marginTop: THEME.spacing.sm, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', backgroundColor: THEME.colors.success, borderRadius: 4 },
  scoreText: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 4 },
  activeDeliveryCard: {
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md, marginBottom: THEME.spacing.md,
    borderLeftWidth: 4, borderLeftColor: THEME.colors.warning,
  },
  activeLabel: { color: THEME.colors.warning, fontSize: 12, fontWeight: '600' },
  restaurantName: { fontSize: 18, fontWeight: '600', marginTop: 4, color: THEME.colors.text },
  deliveryAddress: { color: THEME.colors.textSecondary, marginTop: 4 },
  estimatedTime: { color: THEME.colors.primary, fontWeight: '600', marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  actionButton: {
    flex: 1, backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md, alignItems: 'center',
  },
  actionText: { color: THEME.colors.primary, fontWeight: '600' },
});
