/**
 * Earnings Screen
 *
 * Shows earnings history, wallet balance, and payout actions.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P127
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../_layout';

interface EarningsData {
  currentBalance: number;
  pendingEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  lifetimeEarnings: number;
  commissionRate: number;
  nextPayout: string;
  recentTransactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'delivery' | 'payout' | 'bonus' | 'commission';
  amount: number;
  description: string;
  timestamp: string;
}

const MOCK_DATA: EarningsData = {
  currentBalance: 1245.50,
  pendingEarnings: 380.00,
  thisWeekEarnings: 3245.00,
  thisMonthEarnings: 12450.00,
  lifetimeEarnings: 87350.00,
  commissionRate: 0.15,
  nextPayout: '2026-05-13T00:00:00Z',
  recentTransactions: [
    { id: 't1', type: 'delivery', amount: 45.00, description: 'Nando\'s Gateway -> Umhlanga', timestamp: '2026-05-11T14:30:00Z' },
    { id: 't2', type: 'delivery', amount: 72.50, description: 'Ocean Basket -> Ballito', timestamp: '2026-05-11T13:15:00Z' },
    { id: 't3', type: 'commission', amount: -17.63, description: 'Platform commission (15%)', timestamp: '2026-05-11T13:15:00Z' },
    { id: 't4', type: 'payout', amount: -2500.00, description: 'Ozow instant payout', timestamp: '2026-05-10T18:00:00Z' },
    { id: 't5', type: 'bonus', amount: 100.00, description: 'Peak hours bonus', timestamp: '2026-05-10T14:00:00Z' },
  ],
};

export default function EarningsScreen(): React.JSX.Element {
  const [data] = useState<EarningsData>(MOCK_DATA);
  const [period, setPeriod] = useState<'week' | 'month' | 'lifetime'>('week');

  const getPeriodAmount = (): number => {
    switch (period) {
      case 'week': return data.thisWeekEarnings;
      case 'month': return data.thisMonthEarnings;
      case 'lifetime': return data.lifetimeEarnings;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>R {data.currentBalance.toFixed(2)}</Text>
        <Text style={styles.pendingText}>+ R {data.pendingEarnings.toFixed(2)} pending</Text>
        <TouchableOpacity style={styles.payoutButton}>
          <Text style={styles.payoutButtonText}>Instant Payout</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'lifetime'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.periodAmount}>
        <Text style={styles.periodAmountText}>R {getPeriodAmount().toFixed(2)}</Text>
        <Text style={styles.periodAmountLabel}>
          {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'Lifetime'}
        </Text>
      </View>

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {data.recentTransactions.map((tx) => (
        <View key={tx.id} style={styles.transactionRow}>
          <View style={styles.txInfo}>
            <Text style={styles.txDescription}>{tx.description}</Text>
            <Text style={styles.txTimestamp}>
              {new Date(tx.timestamp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
            </Text>
          </View>
          <Text style={[styles.txAmount, tx.amount >= 0 ? styles.txPositive : styles.txNegative]}>
            {tx.amount >= 0 ? '+' : ''}R {Math.abs(tx.amount).toFixed(2)}
          </Text>
        </View>
      ))}

      {/* Next Payout Info */}
      <View style={styles.nextPayout}>
        <Text style={styles.nextPayoutLabel}>Next scheduled payout</Text>
        <Text style={styles.nextPayoutDate}>
          {new Date(data.nextPayout).toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.commissionNote}>Commission rate: {(data.commissionRate * 100).toFixed(0)}%</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: THEME.spacing.md, backgroundColor: THEME.colors.background },
  balanceCard: {
    backgroundColor: THEME.colors.primary, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg, marginBottom: THEME.spacing.md, alignItems: 'center',
  },
  balanceLabel: { color: '#FFFFFFAA', fontSize: 14 },
  balanceAmount: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', marginVertical: 4 },
  pendingText: { color: '#FFFFFFAA', fontSize: 14 },
  payoutButton: {
    backgroundColor: '#FFFFFF', borderRadius: THEME.borderRadius.full,
    paddingHorizontal: THEME.spacing.lg, paddingVertical: THEME.spacing.sm, marginTop: THEME.spacing.md,
  },
  payoutButtonText: { color: THEME.colors.primary, fontWeight: '700', fontSize: 16 },
  periodSelector: { flexDirection: 'row', gap: THEME.spacing.sm, marginBottom: THEME.spacing.md },
  periodButton: {
    flex: 1, padding: THEME.spacing.sm, borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface, alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: THEME.colors.primary },
  periodText: { color: THEME.colors.textSecondary, fontWeight: '500' },
  periodTextActive: { color: '#FFFFFF' },
  periodAmount: { alignItems: 'center', marginBottom: THEME.spacing.lg },
  periodAmountText: { fontSize: 28, fontWeight: '700', color: THEME.colors.text },
  periodAmountLabel: { color: THEME.colors.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: THEME.colors.text, marginBottom: THEME.spacing.sm },
  transactionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md, marginBottom: THEME.spacing.xs,
  },
  txInfo: { flex: 1 },
  txDescription: { fontSize: 14, color: THEME.colors.text },
  txTimestamp: { fontSize: 12, color: THEME.colors.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '600' },
  txPositive: { color: THEME.colors.success },
  txNegative: { color: THEME.colors.error },
  nextPayout: {
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md, marginTop: THEME.spacing.md, marginBottom: THEME.spacing.xl,
    alignItems: 'center',
  },
  nextPayoutLabel: { color: THEME.colors.textSecondary, fontSize: 13 },
  nextPayoutDate: { fontSize: 16, fontWeight: '600', color: THEME.colors.text, marginTop: 4 },
  commissionNote: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 4 },
});
