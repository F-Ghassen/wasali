import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useUIStore } from '@/stores/uiStore';

interface QrScannerModalProps {
  visible: boolean;
  expectedBookingId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function QrScannerModal({ visible, expectedBookingId, onSuccess, onClose }: QrScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const { showToast } = useUIStore();
  const scannedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      if (permission && !permission.granted) {
        requestPermission().then((result) => {
          if (!result.granted) {
            showToast('Camera access denied', 'error');
            onClose();
          }
        });
      }
    }
  }, [visible]);

  const handleBarcode = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;

    if (data !== expectedBookingId) {
      showToast("QR code doesn't match this booking", 'error');
      scannedRef.current = false;
      return;
    }

    Alert.alert(
      'QR Code Matched',
      'Confirm you have collected this package?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => { scannedRef.current = false; },
        },
        {
          text: 'Confirm',
          onPress: () => {
            onClose();
            onSuccess();
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scan Sender's QR</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Camera */}
        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcode}
          >
            {/* Viewfinder overlay */}
            <View style={styles.overlay}>
              <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.hint}>Point at the sender's booking QR code</Text>
            </View>
          </CameraView>
        ) : (
          <View style={styles.permissionPlaceholder}>
            <Text style={styles.permissionText}>Camera permission required</Text>
            <TouchableOpacity onPress={() => requestPermission()} style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>Grant Access</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  viewfinder: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  hint: { color: Colors.white, fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },
  permissionPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  permissionText: { color: Colors.white, fontSize: FontSize.base },
  permissionBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  permissionBtnText: { color: Colors.black, fontWeight: '700', fontSize: FontSize.base },
});
