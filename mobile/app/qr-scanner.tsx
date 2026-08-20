import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { colors, FONTS } from '@/constants/brand';

export default function QRScannerScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        <View style={styles.center}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.instruction}>Scan QR code to pair device</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.hint}>Align the QR code within the frame</Text>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 48,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(240, 237, 228, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: FONTS.jetbrains,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  center: {
    alignItems: 'center',
    gap: 24,
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.accent,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.accent,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.accent,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.accent,
  },
  instruction: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.7,
  },
  bottom: {
    alignItems: 'center',
  },
  hint: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.4,
  },
});
