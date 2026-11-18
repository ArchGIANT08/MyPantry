import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ItemForm, type FormValues } from '../components/ItemForm';
import { findByBarcode } from '../inventory';
import { lookupBarcode } from '../productLookup';
import { useInventory } from '../store';
import { useTheme, type Theme } from '../theme';
import { LOCATIONS } from '../types';

// Grocery barcodes. QR codes are left out so they don't trigger by accident.
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

type Pending = { initial: FormValues; note?: string };

export function ScanScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const s = styles(t);
  const [permission, requestPermission] = useCameraPermissions();
  const { items, add } = useInventory();
  const [looking, setLooking] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const busy = useRef(false);
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current || pending) return;
    // The camera fires many events per second; ignore a repeat of the code just handled.
    const now = Date.now();
    if (lastCode.current && lastCode.current.code === data && now - lastCode.current.at < 3000) return;
    busy.current = true;
    lastCode.current = { code: data, at: now };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const existing = findByBarcode(itemsRef.current, data);
    const have = existing.length
      ? `You already have ${existing
          .map((e) => `${e.quantity} in the ${LOCATIONS.find((l) => l.key === e.location)!.label.toLowerCase()}`)
          .join(' and ')}.`
      : undefined;

    // If we've scanned it before, reuse what we know and skip the network.
    if (existing.length) {
      const e = existing[0];
      setPending({
        initial: { name: e.name, brand: e.brand, size: e.size, imageUrl: e.imageUrl, barcode: data, location: e.location, quantity: 1 },
        note: have,
      });
      busy.current = false;
      return;
    }

    setLooking(true);
    try {
      const product = await lookupBarcode(data);
      setPending(
        product
          ? { initial: { ...product, location: product.suggestedLocation ?? 'pantry', quantity: 1 } }
          : {
              initial: { name: '', barcode: data, location: 'pantry', quantity: 1 },
              note: "We couldn't find this product. Type a name and it'll be remembered next time you scan it.",
            },
      );
    } catch {
      setPending({
        initial: { name: '', barcode: data, location: 'pantry', quantity: 1 },
        note: "Couldn't look this up (no connection?). Type a name to add it anyway.",
      });
    } finally {
      setLooking(false);
      busy.current = false;
    }
  };

  const closeForm = () => {
    setPending(null);
    // Give the user a moment to move the item out of frame.
    lastCode.current = { code: lastCode.current?.code ?? '', at: Date.now() };
  };

  if (!permission) {
    return <View style={s.center}><ActivityIndicator color={t.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permEmoji}>📷</Text>
        <Text style={s.permTitle}>Camera access needed</Text>
        <Text style={s.permText}>MyPantry uses the camera to read barcodes so adding groceries takes a second.</Text>
        <Pressable
          style={s.permBtn}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        >
          <Text style={s.permBtnText}>{permission.canAskAgain ? 'Allow camera' : 'Open Settings'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {active && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={pending || looking ? undefined : onScanned}
        />
      )}
      <View style={s.overlay} pointerEvents="box-none">
        <Text style={s.hint}>Point at a barcode</Text>
        <View style={s.frame} />
        {looking ? (
          <View style={s.status}>
            <ActivityIndicator color="#fff" />
            <Text style={s.statusText}>Looking it up…</Text>
          </View>
        ) : toast ? (
          <View style={s.status}>
            <Text style={s.statusText}>✓ {toast}</Text>
          </View>
        ) : (
          <View style={{ height: 44 }} />
        )}
        <View style={s.actions}>
          <Pressable style={s.actionBtn} onPress={() => setTorch((v) => !v)}>
            <Text style={s.actionText}>{torch ? '🔦 Light off' : '🔦 Light'}</Text>
          </Pressable>
          <Pressable
            style={s.actionBtn}
            onPress={() => setPending({ initial: { name: '', location: 'pantry', quantity: 1 } })}
          >
            <Text style={s.actionText}>⌨️ Type it in</Text>
          </Pressable>
        </View>
      </View>

      <ItemForm
        visible={!!pending}
        title="Add item"
        submitLabel="Add"
        initial={pending?.initial ?? { name: '', location: 'pantry', quantity: 1 }}
        note={pending?.note}
        onSubmit={(v) => {
          add(v);
          const where = LOCATIONS.find((l) => l.key === v.location)!.label.toLowerCase();
          setToast(`Added ${v.quantity > 1 ? `${v.quantity} × ` : ''}${v.name} to the ${where}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          closeForm();
        }}
        onCancel={closeForm}
      />
    </View>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: t.bg },
    permEmoji: { fontSize: 48, marginBottom: 8 },
    permTitle: { fontSize: 19, fontWeight: '600', color: t.text },
    permText: { fontSize: 15, color: t.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 },
    permBtn: { marginTop: 20, backgroundColor: t.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12 },
    permBtnText: { color: t.primaryText, fontSize: 16, fontWeight: '600' },
    overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
    hint: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 16,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowRadius: 4,
    },
    frame: { width: '78%', aspectRatio: 1.7, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 18 },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 20,
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.65)',
      maxWidth: '90%',
    },
    statusText: { color: '#fff', fontSize: 15 },
    actions: { position: 'absolute', bottom: 24, flexDirection: 'row', gap: 12 },
    actionBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24 },
    actionText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  });
