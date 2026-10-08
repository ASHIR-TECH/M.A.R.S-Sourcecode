import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { DeviceHubScreen } from '../DeviceHub/DeviceHubScreen';
import { QRScannerScreen } from '../QRScanner/QRScannerScreen';
import { useDeviceStore } from '../../store/useDeviceStore';

/**
 * Devices tab (Phase 8): hosts the Device Hub. The add-device button opens
 * the pairing scanner; the hub's back chevron is a no-op here since this is
 * the tab root (real stack navigation lands with the FAB phase). When there
 * are no devices at all the scanner opens as soon as the tab is active so
 * the first peer always gets paired.
 *
 * The infinite-loop pager mounts this screen in two copies (the ring wraps).
 * The camera must only ever run on the copy that is actually on screen, so it
 * needs both `isActive` (logical tab) and `activePage` (this copy is visible);
 * the off-screen copy keeps showing the hub.
 */
interface DevicesScreenProps {
  isActive?: boolean;
  activePage?: boolean;
}

export const DevicesScreen = React.memo(function DevicesScreen({
  isActive = true,
  activePage = true,
}: DevicesScreenProps) {
  // No devices yet → come in with the scanner on immediately.
  const hasDevices = useDeviceStore((s) => s.devices.length > 0);
  const [scannerOpen, setScannerOpen] = useState(!hasDevices);

  // Once the first peer is paired, close the scanner everywhere (both copies).
  useEffect(() => {
    if (hasDevices) setScannerOpen(false);
  }, [hasDevices]);

  if (scannerOpen && isActive && activePage) {
    return <QRScannerScreen onPaired={() => setScannerOpen(false)} onClose={() => setScannerOpen(false)} />;
  }

  return (
    <View style={styles.container}>
      <DeviceHubScreen onAddDevice={() => setScannerOpen(true)} onBack={() => {}} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
});