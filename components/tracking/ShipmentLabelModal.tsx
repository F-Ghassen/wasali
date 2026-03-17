import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { X, Printer } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LabelData {
  trackingId: string;       // e.g. 'WSL-20483'
  originCity: string;       // 'Berlin'
  originFlag: string;       // '🇩🇪'
  destCity: string;         // 'Tunis'
  destFlag: string;         // '🇹🇳'
  departureDate: string;    // 'Mar 10'
  arrivalDate: string;      // 'Mar 16'
  driverName: string;       // 'Khalil H.'
  driverRating: number;
  driverTrips: number;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddressLine1: string;
  recipientAddressLine2: string;
  weightKg: number;
  deliveryMethod: string;   // 'Home delivery'
}

interface Props {
  visible: boolean;
  onClose: () => void;
  data: LabelData;
}

// ─── HTML template for print/PDF ──────────────────────────────────────────────

function buildHtml(d: LabelData, qrDataUrl: string): string {
  const trackingUrl = `https://wasil.app/t/${d.trackingId}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 13px;
    color: #000;
    background: #fff;
    padding: 32px;
    max-width: 600px;
    margin: 0 auto;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .brand { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
  .qr img { width: 88px; height: 88px; }
  hr { border: none; border-top: 1.5px solid #000; margin: 12px 0; }
  .route { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .dates { font-size: 13px; color: #444; margin-bottom: 8px; }
  .driver { font-size: 13px; color: #222; margin-bottom: 4px; }
  .parties { display: flex; gap: 0; margin: 4px 0; }
  .party { flex: 1; }
  .party-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .party-name { font-size: 14px; font-weight: 700; }
  .party-phone { font-size: 12px; color: #444; margin-top: 2px; }
  .party-addr { font-size: 12px; color: #444; margin-top: 2px; }
  .ref-row { font-size: 14px; font-weight: 700; letter-spacing: 0.3px; margin: 4px 0; }
  .footer { font-size: 11px; color: #888; text-align: center; margin-top: 6px; }
  .tracking-url { font-size: 10px; color: #aaa; text-align: center; margin-top: 3px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">WASIL</div>
    <div class="qr"><img src="${qrDataUrl}" alt="QR" /></div>
  </div>
  <hr />
  <div class="route">${d.originFlag} ${d.originCity} → ${d.destFlag} ${d.destCity}</div>
  <div class="dates">${d.departureDate} – ${d.arrivalDate}</div>
  <div class="driver">Driver: ${d.driverName} ★${d.driverRating} · ${d.driverTrips} trips</div>
  <hr />
  <div class="parties">
    <div class="party">
      <div class="party-label">FROM</div>
      <div class="party-name">${d.senderName}</div>
      <div class="party-phone">${d.senderPhone}</div>
    </div>
    <div class="party">
      <div class="party-label">TO</div>
      <div class="party-name">${d.recipientName}</div>
      <div class="party-phone">${d.recipientPhone}</div>
      <div class="party-addr">${d.recipientAddressLine1}</div>
      <div class="party-addr">${d.recipientAddressLine2}</div>
    </div>
  </div>
  <hr />
  <div class="ref-row">${d.trackingId} &nbsp;|&nbsp; ${d.weightKg} kg &nbsp;|&nbsp; ${d.deliveryMethod}</div>
  <hr />
  <div class="footer">Paid &amp; escrow protected · wasil.app</div>
  <div class="tracking-url">${trackingUrl}</div>
</body>
</html>`;
}

// ─── Print handler ────────────────────────────────────────────────────────────

async function handlePrint(data: LabelData, qrDataUrl: string) {
  const html = buildHtml(data, qrDataUrl);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
  } else {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Shipment label ${data.trackingId}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  }
}

// ─── Label preview ────────────────────────────────────────────────────────────

function Divider() {
  return <View style={lbl.divider} />;
}

function LabelPreview({ data }: { data: LabelData }) {
  const trackingUrl = `https://wasil.app/t/${data.trackingId}`;

  return (
    <View style={lbl.card}>
      {/* Top row: brand + QR */}
      <View style={lbl.topRow}>
        <Text style={lbl.brand}>WASIL</Text>
        <QRCode
          value={trackingUrl}
          size={72}
          color="#000000"
          backgroundColor="#FFFFFF"
        />
      </View>

      <Divider />

      {/* Route + dates */}
      <Text style={lbl.route}>
        {data.originFlag} {data.originCity} → {data.destFlag} {data.destCity}
      </Text>
      <Text style={lbl.dates}>{data.departureDate} – {data.arrivalDate}</Text>
      <Text style={lbl.driver}>
        Driver: {data.driverName} ★{data.driverRating} · {data.driverTrips} trips
      </Text>

      <Divider />

      {/* FROM / TO */}
      <View style={lbl.parties}>
        <View style={lbl.party}>
          <Text style={lbl.partyLabel}>FROM</Text>
          <Text style={lbl.partyName}>{data.senderName}</Text>
          <Text style={lbl.partyPhone}>{data.senderPhone}</Text>
        </View>
        <View style={lbl.partySep} />
        <View style={lbl.party}>
          <Text style={lbl.partyLabel}>TO</Text>
          <Text style={lbl.partyName}>{data.recipientName}</Text>
          <Text style={lbl.partyPhone}>{data.recipientPhone}</Text>
          {data.recipientAddressLine1 !== '' && (
            <Text style={lbl.partyAddr}>{data.recipientAddressLine1}</Text>
          )}
          {data.recipientAddressLine2 !== '' && (
            <Text style={lbl.partyAddr}>{data.recipientAddressLine2}</Text>
          )}
        </View>
      </View>

      <Divider />

      {/* Ref row */}
      <Text style={lbl.refRow}>
        {data.trackingId}{'  '}|{'  '}{data.weightKg} kg{'  '}|{'  '}{data.deliveryMethod}
      </Text>

      <Divider />

      <Text style={lbl.footer}>Paid & escrow protected · wasil.app</Text>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ShipmentLabelModal({ visible, onClose, data }: Props) {
  const [printing, setPrinting] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

  const trackingUrl = `https://wasil.app/t/${data.trackingId}`;

  async function onPrint() {
    setPrinting(true);
    try {
      await handlePrint(data, qrDataUrl);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={m.root}>
        {/* Header */}
        <View style={m.header}>
          <Text style={m.title}>Shipment label</Text>
          <TouchableOpacity onPress={onClose} style={m.closeBtn} activeOpacity={0.7}>
            <X size={20} color={Colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={m.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hidden QR used to capture data URL for HTML */}
          <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
            <QRCode
              value={trackingUrl}
              size={88}
              color="#000000"
              backgroundColor="#FFFFFF"
              getRef={(ref) => {
                if (ref && qrDataUrl === '') {
                  (ref as any).toDataURL?.((dataUrl: string) => {
                    setQrDataUrl(`data:image/png;base64,${dataUrl}`);
                  });
                }
              }}
            />
          </View>

          <LabelPreview data={data} />

          <Text style={m.hint}>
            Tap "Print / Save PDF" to download or share the label. Attach it to your package before hand-off to the driver.
          </Text>
        </ScrollView>

        {/* Footer action */}
        <View style={m.footer}>
          <TouchableOpacity
            style={[m.printBtn, printing && m.printBtnDisabled]}
            onPress={onPrint}
            activeOpacity={0.85}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Printer size={18} color={Colors.white} strokeWidth={2} />
            )}
            <Text style={m.printBtnText}>
              {printing ? 'Preparing…' : 'Print / Save PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const lbl = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1.5,
    backgroundColor: Colors.text.primary,
    marginVertical: Spacing.sm,
  },
  route: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 3,
  },
  dates: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  driver: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  parties: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  party: { flex: 1 },
  partySep: {
    width: 1,
    backgroundColor: Colors.border.light,
    marginHorizontal: Spacing.xs,
  },
  partyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  partyName:  { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  partyPhone: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  partyAddr:  { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 1 },
  refRow: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  footer: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
});

const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeBtn: { padding: Spacing.xs },
  scroll: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  footer: {
    padding: Spacing.base,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  printBtnDisabled: { opacity: 0.6 },
  printBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.base,
  },
});
