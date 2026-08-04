/**
 * Connected Accounts screen – React Native
 *
 * Uses expo-web-browser / react-native-inappbrowser-reborn
 * or the platform system browser for the OAuth redirect.
 *
 * Install:
 *   npx expo install expo-web-browser expo-linking
 *   or
 *   yarn add react-native-inappbrowser-reborn
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import {
  startOAuth,
  getConnections,
  disconnectProvider,
} from '../services/oauthService';

// Deep link scheme – must match what your backend redirects to
// e.g. myapp://connected-accounts?success=x&score=15
const REDIRECT_SCHEME = 'myapp';

const PROVIDERS = [
  { key: 'x', label: 'X', color: '#1DA1F2', icon: '𝕏' },
  { key: 'spotify', label: 'Spotify', color: '#1DB954', icon: '♪' },
  // Add more when you implement them on the backend
  // { key: 'instagram', label: 'Instagram', color: '#E1306C', icon: '📷' },
  // { key: 'tiktok', label: 'TikTok', color: '#000', icon: '♪' },
  // { key: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'f' },
  // { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'in' },
];

export default function ConnectedAccountsScreen() {
  // In a real app this comes from your auth context
  const userId = 'demo-user-123';

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null); // provider key currently connecting
  const [connections, setConnections] = useState([]);
  const [trustScore, setTrustScore] = useState(0);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConnections(userId);
      setConnections(data.connections || []);
      setTrustScore(data.trustScore || 0);
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'Could not load connected accounts');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConnections();

    // Listen for the deep-link redirect after OAuth finishes
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [loadConnections]);

  function handleDeepLink({ url }) {
    // Example: myapp://connected-accounts?success=x&score=15
    // or       myapp://connected-accounts?error=access_denied
    const { queryParams } = Linking.parse(url);

    if (queryParams?.success) {
      Alert.alert(
        'Connected!',
        `${queryParams.success.toUpperCase()} linked successfully.\nNew trust score: ${queryParams.score}`
      );
      loadConnections();
    } else if (queryParams?.error) {
      Alert.alert('Connection failed', queryParams.error);
    }

    setConnecting(null);
  }

  async function handleConnect(providerKey) {
    try {
      setConnecting(providerKey);

      // 1. Ask backend for the authorization URL (with PKCE params already baked in)
      const authUrl = await startOAuth(providerKey, userId);

      // 2. Open system browser (never a WebView)
      // expo-web-browser will open Safari / Chrome Custom Tabs
      // and automatically close when the redirect URI is hit
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        `${REDIRECT_SCHEME}://connected-accounts`
      );

      // result.type can be 'success' | 'cancel' | 'dismiss'
      if (result.type === 'success' && result.url) {
        // The deep-link listener above will also fire,
        // but we can handle it here too for reliability
        handleDeepLink({ url: result.url });
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setConnecting(null);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to start connection');
      setConnecting(null);
    }
  }

  async function handleDisconnect(providerKey) {
    Alert.alert(
      'Disconnect',
      `Remove ${providerKey} from your account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await disconnectProvider(providerKey, userId);
              setTrustScore(data.trustScore);
              await loadConnections();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  const isConnected = (key) =>
    connections.some((c) => c.provider === key);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#00BFFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Connected Accounts</Text>
        <Text style={styles.subtitle}>
          Link your accounts to boost your trust score.
        </Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Trust Score</Text>
          <Text style={styles.scoreValue}>{trustScore}</Text>
        </View>

        {PROVIDERS.map((p) => {
          const connected = isConnected(p.key);
          const isLoading = connecting === p.key;

          return (
            <View key={p.key} style={styles.row}>
              <View style={[styles.icon, { backgroundColor: p.color }]}>
                <Text style={styles.iconText}>{p.icon}</Text>
              </View>

              <View style={styles.info}>
                <Text style={styles.providerName}>{p.label}</Text>
                <Text style={styles.status}>
                  {connected ? 'Connected' : 'Not connected'}
                </Text>
              </View>

              {connected ? (
                <TouchableOpacity
                  style={[styles.button, styles.disconnectBtn]}
                  onPress={() => handleDisconnect(p.key)}
                >
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.connectBtn]}
                  onPress={() => handleConnect(p.key)}
                  disabled={!!connecting}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.connectText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  scoreCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  scoreLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  scoreValue: {
    color: '#00BFFF',
    fontSize: 42,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  providerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  connectBtn: {
    backgroundColor: '#00BFFF',
  },
  connectText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  disconnectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  disconnectText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 14,
  },
});
