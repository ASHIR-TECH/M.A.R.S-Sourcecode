import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppBackground } from '../../components/AppBackground';
import { useDeviceStore } from '../../store/useDeviceStore';
import { NodeCard } from '../../components/NodeCard';
import { EditDeviceModal } from './EditDeviceModal';
import { DeviceWithMetrics } from '../../types/device';
import { glass } from '../../theme/glass';
import { styles } from './DeviceHubScreen.styles';

interface DeviceHubScreenProps {
  onAddDevice: () => void;
  onBack: () => void;
}

/** Device grid (2 per row) showing the same card info as Home — nothing more.
 * Cards aren't expandable; the edit button renames a device. The screen owns
 * its orb background so a neighboring tab never bleeds through the blur. */
export function DeviceHubScreen({ onAddDevice, onBack }: DeviceHubScreenProps) {
  const devices = useDeviceStore((s) => s.devices) as DeviceWithMetrics[];
  const renameDevice = useDeviceStore((s) => s.renameDevice);
  // Devices shows the full list (top 4 and everything else); Home only surfaces the top cap.
  const hubDevices = devices;
  const [editing, setEditing] = useState<DeviceWithMetrics | null>(null);

  return (
    <AppBackground>
      <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            {'←'}
          </Text>
          <Text style={styles.title}>DEVICE HUB</Text>
          <Text onPress={onAddDevice} style={styles.add} accessibilityRole="button" accessibilityLabel="Add device">
            {'+'}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>All Connected Peers ({hubDevices.length})</Text>

        <FlatList
          data={hubDevices}
          keyExtractor={(d) => d.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => <NodeCard node={item} onEdit={setEditing} />}
        />
      </View>

      <EditDeviceModal
        device={editing}
        onClose={() => setEditing(null)}
        onSave={(id, updates) => {
          renameDevice(id, updates);
          setEditing(null);
        }}
      />
    </AppBackground>
  );
}