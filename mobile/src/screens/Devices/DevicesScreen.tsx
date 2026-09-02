import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { DeviceHubScreen } from '../DeviceHub/DeviceHubScreen';
import { QRScannerScreen } from '../QRScanner/QRScannerScreen';
import { useDeviceStore } from '../../store/useDeviceStore';

/**
 * Devices tab (Phase 8): hosts the Device Hub. The add-device button opens
 * the pairing scanner; the hub's back chevron is a no-op here since this is
 * the tab root (real stack navigation lands with the FAB phase). When there
 * are no devices at all the scanner starts open so the first peer always gets
 * paired.
 */
export function DevicesScreen() {
  // No devices yet → come in with the scanner on immediately.
  const hasDevices = useDeviceStore((s) => s.devices.length > 0);
  const [scannerOpen, setScannerOpen] = useState(!hasDevices);

  if (scannerOpen) {
    return <QRScannerScreen onPaired={() => setScannerOpen(false)} onClose={() => setScannerOpen(false)} />;
  }

  return (
    <View style={styles.container}>
      <DeviceHubScreen onAddDevice={() => setScannerOpen(true)} onBack={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});