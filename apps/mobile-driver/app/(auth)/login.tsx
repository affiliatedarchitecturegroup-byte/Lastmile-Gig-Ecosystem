/**
 * Driver Login Screen
 *
 * Auth0 login flow with biometric shift-start verification.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P122
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { THEME } from '../_layout';

export default function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      // In production: Auth0 PKCE flow via expo-auth-session
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert('Success', 'Logged in successfully. Redirecting to dashboard...');
    } catch {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>LMG</Text>
        <Text style={styles.subtitle}>Driver App</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="driver@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotLink}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.biometricButton}>
          <Text style={styles.biometricText}>Sign in with Biometric</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Lastmile Gig (Pty) Ltd - v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: THEME.colors.background,
    justifyContent: 'center', padding: THEME.spacing.lg,
  },
  logoContainer: { alignItems: 'center', marginBottom: THEME.spacing.xl * 2 },
  logo: { fontSize: 48, fontWeight: '900', color: THEME.colors.primary },
  subtitle: { fontSize: 18, color: THEME.colors.textSecondary, marginTop: 4 },
  form: { backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg, padding: THEME.spacing.lg },
  label: { fontSize: 14, fontWeight: '500', color: THEME.colors.text, marginBottom: 4, marginTop: THEME.spacing.md },
  input: {
    borderWidth: 1, borderColor: THEME.colors.border, borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm, fontSize: 16, color: THEME.colors.text,
  },
  loginButton: {
    backgroundColor: THEME.colors.primary, borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md, alignItems: 'center', marginTop: THEME.spacing.lg,
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  forgotLink: { alignItems: 'center', marginTop: THEME.spacing.md },
  forgotText: { color: THEME.colors.primary, fontSize: 14 },
  biometricButton: {
    borderWidth: 1, borderColor: THEME.colors.primary, borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm, alignItems: 'center', marginTop: THEME.spacing.md,
  },
  biometricText: { color: THEME.colors.primary, fontWeight: '600' },
  footer: { textAlign: 'center', color: THEME.colors.textSecondary, marginTop: THEME.spacing.xl, fontSize: 12 },
});
