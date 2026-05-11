/**
 * Driver Profile Screen
 *
 * Shows driver profile, tier badge, vehicle info, and settings.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../_layout';

interface DriverProfile {
  name: string;
  email: string;
  phone: string;
  zone: string;
  vehicleType: string;
  tier: string;
  score: number;
  totalDeliveries: number;
  memberSince: string;
  bankVerified: boolean;
  biometricEnrolled: boolean;
}

const MOCK_PROFILE: DriverProfile = {
  name: 'Sipho Ndlovu',
  email: 's***@example.com',
  phone: '+27***XXX789',
  zone: 'KZN-North',
  vehicleType: 'Scooter',
  tier: 'Gold',
  score: 87,
  totalDeliveries: 1247,
  memberSince: '2025-09-15',
  bankVerified: true,
  biometricEnrolled: true,
};

export default function ProfileScreen(): React.JSX.Element {
  const [profile] = useState<DriverProfile>(MOCK_PROFILE);

  const tierColors: Record<string, string> = {
    Bronze: '#CD7F32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Elite: '#8B5CF6',
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={[styles.tierBadge, { backgroundColor: tierColors[profile.tier] ?? '#888' }]}>
          <Text style={styles.tierText}>{profile.tier} Tier</Text>
        </View>
        <Text style={styles.memberSince}>
          Member since {new Date(profile.memberSince).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.totalDeliveries}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.score}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.zone}</Text>
          <Text style={styles.statLabel}>Zone</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Details</Text>
        <DetailRow label="Vehicle" value={profile.vehicleType} />
        <DetailRow label="Zone" value={profile.zone} />
        <DetailRow label="Email" value={profile.email} />
        <DetailRow label="Phone" value={profile.phone} />
        <DetailRow label="Bank Verified" value={profile.bankVerified ? 'Yes' : 'No'} />
        <DetailRow label="Biometric" value={profile.biometricEnrolled ? 'Enrolled' : 'Pending'} />
      </View>

      {/* Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionText}>View Documents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionText}>Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionItem, styles.logoutItem]}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: THEME.spacing.md, backgroundColor: THEME.colors.background },
  headerCard: {
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg, alignItems: 'center', marginBottom: THEME.spacing.md,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: THEME.colors.text, marginTop: THEME.spacing.sm },
  tierBadge: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: THEME.borderRadius.full, marginTop: THEME.spacing.sm,
  },
  tierText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  memberSince: { color: THEME.colors.textSecondary, marginTop: THEME.spacing.xs, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: THEME.spacing.sm, marginBottom: THEME.spacing.md },
  statCard: {
    flex: 1, backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: THEME.colors.text },
  statLabel: { fontSize: 12, color: THEME.colors.textSecondary, marginTop: 2 },
  detailsCard: {
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md, marginBottom: THEME.spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: THEME.colors.text, marginBottom: THEME.spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: THEME.colors.border },
  detailLabel: { color: THEME.colors.textSecondary, fontSize: 14 },
  detailValue: { color: THEME.colors.text, fontSize: 14, fontWeight: '500' },
  actionsCard: {
    backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.xl,
  },
  actionItem: { padding: THEME.spacing.md, borderBottomWidth: 1, borderBottomColor: THEME.colors.border },
  actionText: { color: THEME.colors.primary, fontSize: 16, fontWeight: '500' },
  logoutItem: { borderBottomWidth: 0 },
  logoutText: { color: THEME.colors.error, fontSize: 16, fontWeight: '500' },
});
