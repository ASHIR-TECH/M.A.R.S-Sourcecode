import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, FONTS } from '@/constants/brand';

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // data could be a pairing URL or a peer ID
    // For now, go back and let the caller handle it
    router.back();
  };

  if (!permission) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Requesting camera access...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.permissionState}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionHint}>
            MARS needs camera access to scan QR codes for device pairing.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>GRANT ACCESS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Top dimmed area */}
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

      {/* Camera view with scan frame */}
      <View style={styles.scannerBody}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.instruction}>
            {scanned ? 'Code scanned!' : 'Align QR code within the frame'}
          </Text>
        </View>
      </View>

      {/* Bottom anchor */}
      <View style={styles.bottomAnchor}>
        <TouchableOpacity
          style={styles.glassBtnVertical}
          onPress={() => setScanned(false)}
          disabled={!scanned}
        >
          <Text style={styles.glassBtnVerticalText}>RETRY</Text>
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
    opacity: 0.5,
  },
  permissionState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  permissionHint: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  permissionBtnText: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.bg,
    letterSpacing: 1,
  },
  backBtn: {
    marginTop: 8,
  },
  backText: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.accent,
  },
  topDimmed: {
    height: 112,
    opacity: 0.3,
    zIndex: 10,
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
  navTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  scannerBody: {
    flex: 1,
    position: 'relative',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 13, 0, 0.4)',
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
    opacity: 0.9,
  },
  bottomAnchor: {
    alignItems: 'center',
    zIndex: 10,
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
