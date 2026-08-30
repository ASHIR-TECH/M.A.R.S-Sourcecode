import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { QRScannerScreen } from '../QRScanner/QRScannerScreen';

/**
 * Devices placeholder until the Device Hub phase lands. The pairing scanner
 * opens immediately — no chrome of its own yet.
 */
export function DevicesScreen() {
  const [scannerOpen, setScannerOpen] = useState(true);

  if (scannerOpen) {
    return <QRScannerScreen onPaired={() => setScannerOpen(false)} onClose={() => setScannerOpen(false)} />;
  }

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});