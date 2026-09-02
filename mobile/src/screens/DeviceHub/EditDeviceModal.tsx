import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Device } from '../../types/device';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface EditDeviceModalProps {
  device: Device | null;
  onSave: (id: string, updates: { name: string; os: string }) => void;
  onClose: () => void;
}

export function EditDeviceModal({ device, onSave, onClose }: EditDeviceModalProps) {
  const [name, setName] = useState('');
  const [os, setOs] = useState('');

  // Reset fields each time a different device opens the modal.
  React.useEffect(() => {
    if (device) {
      setName(device.name);
      setOs(device.os);
    }
  }, [device]);

  return (
    <Modal visible={device != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Edit Device</Text>
          {device && <Text style={styles.subtitle}>{device.id}</Text>}

          <Text style={styles.label}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Device name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            accessibilityLabel="Device name"
          />

          <Text style={styles.label}>OS</Text>
          <TextInput
            value={os}
            onChangeText={setOs}
            style={styles.input}
            placeholder="Operating system"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Operating system"
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.button, styles.cancel]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => device && onSave(device.id, { name: name.trim() || device.name, os: os.trim() || device.os })}
              style={[styles.button, styles.save]}
              accessibilityRole="button"
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1A0F08',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  title: { color: colors.textPrimary, fontFamily: fonts.quantico, fontSize: 16, letterSpacing: 1 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  button: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8 },
  cancel: { backgroundColor: 'rgba(255,255,255,0.08)' },
  save: { backgroundColor: colors.accent },
  cancelText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  saveText: { color: '#0B0704', fontSize: 14, fontWeight: '700' },
});