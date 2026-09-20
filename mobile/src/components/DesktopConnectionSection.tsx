import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { useDesktopStore } from '../store/useDesktopStore';
import { checkReady } from '../desktop/agentClient';
import { ApiError } from '../desktop/errors';
import { QRScannerScreen } from '../screens/QRScanner/QRScannerScreen';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fonts } from '../theme/typography';

type TestState = 'idle' | 'testing' | 'ok' | 'error';

/** Pair with the desktop agent. Not connected -> tap opens the QR scanner;
 * a scan auto-pairs (the QR carries/derives the agent endpoint). The manual
 * URL + ADTP_API_TOKEN form stays as an advanced option. */
export function DesktopConnectionSection() {
  const connection = useDesktopStore((s) => s.connection);
  const hydrated = useDesktopStore((s) => s.hydrated);
  const saveConnection = useDesktopStore((s) => s.saveConnection);
  const clearConnection = useDesktopStore((s) => s.clearConnection);
  const hydrate = useDesktopStore((s) => s.hydrate);

  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [test, setTest] = useState<TestState>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (open) {
      setUrl(connection?.baseUrl ?? '');
      setToken(connection?.token ?? '');
      setTest('idle');
      setError('');
    }
  }, [open, connection]);

  const handleTest = async () => {
    if (!url.trim() || !token.trim()) {
      setTest('error');
      setError('Enter both the desktop URL and API token.');
      return;
    }
    setTest('testing');
    setError('');
    try {
      await checkReady({ baseUrl: url.trim(), token: token.trim() });
      setTest('ok');
    } catch (e) {
      setTest('error');
      setError(e instanceof ApiError ? e.message : 'Could not reach the desktop.');
    }
  };

  const handleSave = async () => {
    if (!url.trim() || !token.trim()) {
      setTest('error');
      setError('Enter both the desktop URL and API token.');
      return;
    }
    await saveConnection({ baseUrl: url.trim(), token: token.trim(), origin: 'manual' });
    setOpen(false);
  };

  const handleDisconnect = async () => {
    await clearConnection();
    setOpen(false);
  };

  // Scanner is the primary entry point when nothing is paired yet; the manual
  // form stays reachable via the scanner's "Manual" link and while connected.
  const handleRowPress = () => {
    if (connection) {
      setOpen(true);
    } else {
      setScannerOpen(true);
    }
  };

  return (
    <>
      <SettingsSection title="Desktop Agent">
        <SettingsRow
          label={connection ? 'Connected' : 'Not connected'}
          value={
            connection
              ? `${connection.baseUrl.replace(/^https?:\/\//, '')} (${
                  connection.origin === 'qr' ? 'pairing' : 'manual'
                })`
              : 'Scan a pairing QR'
          }
          onPress={handleRowPress}
        />
      </SettingsSection>

      <Modal
        visible={scannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScannerOpen(false)}
      >
        <QRScannerScreen
          onPaired={() => setScannerOpen(false)}
          onClose={() => setScannerOpen(false)}
          onManualSetup={() => {
            setScannerOpen(false);
            setOpen(true);
          }}
        />
      </Modal>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Desktop Agent</Text>
            <Text style={styles.hint}>
              The desktop runs the AI and executes device commands (send file, list peers).
              Scanning its pairing QR configures this automatically; you can also enter the REST
              API URL and ADTP API token manually.
            </Text>

            <Text style={styles.label}>API URL</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://192.168.1.20:40003"
              placeholderTextColor="#A89A84"
              style={styles.input}
            />

            <Text style={styles.label}>API Token</Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="ADTP_API_TOKEN"
              placeholderTextColor="#A89A84"
              style={styles.input}
            />

            {test === 'ok' && <Text style={styles.ok}>Connected — the desktop is reachable.</Text>}
            {test === 'error' && <Text style={styles.err}>{error}</Text>}

            <View style={styles.actions}>
              <Pressable onPress={handleTest} disabled={test === 'testing'} style={styles.secondary}>
                {test === 'testing' ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.secondaryText}>Test Connection</Text>
                )}
              </Pressable>
              <Pressable onPress={handleSave} style={styles.primary}>
                <Text style={styles.primaryText}>Save</Text>
              </Pressable>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.ghost}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              {connection && (
                <Pressable onPress={handleDisconnect} style={styles.ghost}>
                  <Text style={styles.destructive}>Disconnect</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: '#140C05', borderRadius: 16, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(232,163,77,0.4)' },
  title: { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.quantico, marginBottom: spacing.xs },
  hint: { color: '#E6D9C3', fontSize: 14, marginBottom: spacing.md, fontFamily: fonts.montserrat },
  label: { color: colors.accent, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  input: { color: '#FFFFFF', fontSize: 15, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, fontFamily: fonts.montserrat },
  ok: { color: '#5BC48A', fontSize: 14, marginBottom: spacing.sm },
  err: { color: '#FF6B55', fontSize: 14, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  primary: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primaryText: { color: '#1A0F08', fontSize: 15, fontFamily: fonts.quantico },
  secondary: { borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(232,163,77,0.6)', minWidth: 150, alignItems: 'center' },
  secondaryText: { color: colors.accent, fontSize: 14, fontFamily: fonts.montserrat },
  ghost: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  ghostText: { color: '#E6D9C3', fontSize: 14 },
  destructive: { color: '#FF6B55', fontSize: 14 },
});
