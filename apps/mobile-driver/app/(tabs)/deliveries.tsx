/**
 * Delivery Queue Screen
 *
 * Shows available deliveries with accept/reject actions.
 * Real-time updates via WebSocket subscription.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P124
 */

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { THEME } from '../_layout';

interface DeliveryOffer {
  id: string;
  restaurantName: string;
  customerAddress: string;
  distanceKm: number;
  estimatedMinutes: number;
  payout: number;
  expiresIn: number;
}

const MOCK_OFFERS: DeliveryOffer[] = [
  {
    id: 'del-001',
    restaurantName: 'Nando\'s Gateway',
    customerAddress: '45 Marine Drive, Umhlanga',
    distanceKm: 4.2,
    estimatedMinutes: 15,
    payout: 45.00,
    expiresIn: 30,
  },
  {
    id: 'del-002',
    restaurantName: 'Ocean Basket Ballito',
    customerAddress: '12 Compensation Beach Rd',
    distanceKm: 7.8,
    estimatedMinutes: 25,
    payout: 72.50,
    expiresIn: 45,
  },
  {
    id: 'del-003',
    restaurantName: 'Steers Pavilion',
    customerAddress: '99 North Beach, Durban',
    distanceKm: 3.1,
    estimatedMinutes: 12,
    payout: 38.00,
    expiresIn: 20,
  },
];

export default function DeliveryQueueScreen(): React.JSX.Element {
  const [offers, setOffers] = useState<DeliveryOffer[]>(MOCK_OFFERS);

  const handleAccept = (id: string): void => {
    Alert.alert('Delivery Accepted', `You accepted delivery ${id}. Navigate to the restaurant.`);
    setOffers((prev) => prev.filter((o) => o.id !== id));
  };

  const handleReject = (id: string): void => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
  };

  const renderOffer = ({ item }: { item: DeliveryOffer }): React.JSX.Element => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <Text style={styles.restaurantName}>{item.restaurantName}</Text>
        <Text style={styles.payout}>R {item.payout.toFixed(2)}</Text>
      </View>
      <Text style={styles.address}>{item.customerAddress}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.distanceKm} km</Text>
        <Text style={styles.metaDot}>-</Text>
        <Text style={styles.metaText}>{item.estimatedMinutes} min</Text>
        <Text style={styles.metaDot}>-</Text>
        <Text style={styles.expiryText}>Expires in {item.expiresIn}s</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id)}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id)}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Deliveries ({offers.length})</Text>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderOffer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deliveries available</Text>
            <Text style={styles.emptySubtext}>Stay online - new orders coming soon</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: THEME.spacing.md, backgroundColor: THEME.colors.background },
  header: { fontSize: 20, fontWeight: '700', color: THEME.colors.text, marginBottom: THEME.spacing.md },
  offerCard: {
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md, marginBottom: THEME.spacing.sm,
  },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: 16, fontWeight: '600', color: THEME.colors.text, flex: 1 },
  payout: { fontSize: 20, fontWeight: '700', color: THEME.colors.success },
  address: { color: THEME.colors.textSecondary, marginTop: 4, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: THEME.spacing.sm },
  metaText: { color: THEME.colors.textSecondary, fontSize: 13 },
  metaDot: { marginHorizontal: 6, color: THEME.colors.border },
  expiryText: { color: THEME.colors.warning, fontSize: 13, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: THEME.spacing.sm, marginTop: THEME.spacing.md },
  rejectButton: {
    flex: 1, backgroundColor: THEME.colors.background, borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm, alignItems: 'center',
  },
  rejectText: { color: THEME.colors.error, fontWeight: '600' },
  acceptButton: {
    flex: 2, backgroundColor: THEME.colors.success, borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm, alignItems: 'center',
  },
  acceptText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: THEME.spacing.xl * 2 },
  emptyText: { fontSize: 18, fontWeight: '600', color: THEME.colors.textSecondary },
  emptySubtext: { color: THEME.colors.textSecondary, marginTop: THEME.spacing.sm },
});
