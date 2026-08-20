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

      {/* Top dimmed area — status bar + nav */}
      <View style={styles.topDimmed}>
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
        </View>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>QR SCANNER</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      {/* Scanner body */}
      <View style={styles.scannerBody}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.instruction}>Scan QR code to pair device</Text>
        <Text style={styles.hint}>Align the code within the frame</Text>
      </View>

      {/* Bottom anchor — liquid glass vertical button */}
      <View style={styles.bottomAnchor}>
        <TouchableOpacity style={styles.glassBtnVertical} onPress={() => {}}>
          <Text style={styles.glassBtnVerticalText}>FLASH</Text>
        </TouchableOpacity>
        <View style={styles.homeIndicator}>
          <View style={styles.indicatorBar} />
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topDimmed: {
    height: 112,
    opacity: 0.3,
  },
  statusBar: {
    height: 44,
    paddingHorizontal: 24,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTime: {
    fontFamily: FONTS.jetbrains,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  topNav: {
    height: 68,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.accent,
  },
  navTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  scannerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    gap: 24,
  },
  scanFrame: {
    width: 260,
    height: 260,
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
  hint: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.4,
  },
  bottomAnchor: {
    alignItems: 'center',
  },
  glassBtnVertical: {
    width: 64,
    height: 160,
    borderRadius: 32,
    backgroundColor: colors.panelBg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glassBtnVerticalText: {
    fontFamily: FONTS.jetbrains,
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  homeIndicator: {
    height: 25,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  indicatorBar: {
    width: 139,
    height: 5,
    borderRadius: 100,
    backgroundColor: colors.text,
    opacity: 0.2,
  },
});
