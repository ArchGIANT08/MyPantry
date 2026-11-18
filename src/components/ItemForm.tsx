import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidIsoDate } from '../inventory';
import { useTheme, type Theme } from '../theme';
import { LOCATIONS, type Location, type ProductInfo } from '../types';

export type FormValues = ProductInfo & {
  location: Location;
  quantity: number;
  expiresOn?: string;
};

type Props = {
  visible: boolean;
  title: string;
  initial: FormValues;
  /** Shown above the fields, e.g. "Not found — type a name". */
  note?: string;
  submitLabel?: string;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EXPIRY_PRESETS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

export function ItemForm(props: Props) {
  // Re-mount the inner form whenever it opens so state starts from `initial`.
  return (
    <Modal visible={props.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCancel}>
      {props.visible && <FormBody {...props} />}
    </Modal>
  );
}

function FormBody({ title, initial, note, submitLabel = 'Save', onSubmit, onCancel, onDelete }: Props) {
  const t = useTheme();
  const s = styles(t);
  const [name, setName] = useState(initial.name);
  const [brand, setBrand] = useState(initial.brand ?? '');
  const [size, setSize] = useState(initial.size ?? '');
  const [location, setLocation] = useState<Location>(initial.location);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [expiresOn, setExpiresOn] = useState(initial.expiresOn ?? '');

  const submit = () => {
    if (!name.trim()) {
      Alert.alert('Name needed', 'Give the item a name so you can find it later.');
      return;
    }
    const exp = expiresOn.trim();
    if (exp && !isValidIsoDate(exp)) {
      Alert.alert('Check the date', 'Use the format YYYY-MM-DD, e.g. 2026-12-31.');
      return;
    }
    onSubmit({
      ...initial,
      name: name.trim(),
      brand: brand.trim() || undefined,
      size: size.trim() || undefined,
      location,
      quantity,
      expiresOn: exp || undefined,
    });
  };

  const confirmDelete = () =>
    Alert.alert('Remove item?', `Remove ${name || 'this item'} from your inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={s.headerBtn}>Cancel</Text>
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <Pressable onPress={submit} hitSlop={12}>
          <Text style={[s.headerBtn, s.headerBtnPrimary]}>{submitLabel}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {initial.imageUrl ? <Image source={{ uri: initial.imageUrl }} style={s.image} resizeMode="contain" /> : null}
          {note ? <Text style={s.note}>{note}</Text> : null}

          <Text style={s.label}>Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Whole milk"
            placeholderTextColor={t.muted}
            autoFocus={!initial.name}
            returnKeyType="done"
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Brand</Text>
              <TextInput style={s.input} value={brand} onChangeText={setBrand} placeholder="Optional" placeholderTextColor={t.muted} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Size</Text>
              <TextInput style={s.input} value={size} onChangeText={setSize} placeholder="e.g. 1 L" placeholderTextColor={t.muted} />
            </View>
          </View>

          <Text style={s.label}>Where is it?</Text>
          <View style={s.segment}>
            {LOCATIONS.map((l) => (
              <Pressable
                key={l.key}
                onPress={() => setLocation(l.key)}
                style={[s.segmentItem, location === l.key && s.segmentItemOn]}
              >
                <Text style={[s.segmentText, location === l.key && s.segmentTextOn]}>
                  {l.emoji} {l.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>How many?</Text>
          <View style={s.stepper}>
            <Pressable style={s.stepBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Text style={s.stepBtnText}>−</Text>
            </Pressable>
            <Text style={s.stepValue}>{quantity}</Text>
            <Pressable style={s.stepBtn} onPress={() => setQuantity((q) => q + 1)}>
              <Text style={s.stepBtnText}>+</Text>
            </Pressable>
          </View>

          <Text style={s.label}>Use by (optional)</Text>
          <TextInput
            style={s.input}
            value={expiresOn}
            onChangeText={setExpiresOn}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={t.muted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <View style={s.chips}>
            {EXPIRY_PRESETS.map((p) => (
              <Pressable key={p.days} style={s.chip} onPress={() => setExpiresOn(isoInDays(p.days))}>
                <Text style={s.chipText}>{p.label}</Text>
              </Pressable>
            ))}
            {expiresOn ? (
              <Pressable style={s.chip} onPress={() => setExpiresOn('')}>
                <Text style={s.chipText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {initial.barcode ? <Text style={s.barcode}>Barcode {initial.barcode}</Text> : null}

          <Pressable style={s.primaryBtn} onPress={submit}>
            <Text style={s.primaryBtnText}>{submitLabel}</Text>
          </Pressable>
          {onDelete ? (
            <Pressable style={s.deleteBtn} onPress={confirmDelete}>
              <Text style={s.deleteText}>Remove from inventory</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    headerTitle: { fontSize: 17, fontWeight: '600', color: t.text },
    headerBtn: { fontSize: 16, color: t.muted },
    headerBtnPrimary: { color: t.primary, fontWeight: '600' },
    body: { padding: 16, paddingBottom: 48 },
    image: { width: '100%', height: 140, marginBottom: 12, borderRadius: 12, backgroundColor: t.card },
    note: { backgroundColor: t.warnBg, color: t.text, padding: 12, borderRadius: 10, marginBottom: 8, fontSize: 14 },
    label: { fontSize: 13, fontWeight: '600', color: t.muted, marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
    input: {
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: t.text,
    },
    row: { flexDirection: 'row' },
    segment: { flexDirection: 'row', backgroundColor: t.chip, borderRadius: 10, padding: 3 },
    segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    segmentItemOn: { backgroundColor: t.card },
    segmentText: { color: t.muted, fontSize: 15 },
    segmentTextOn: { color: t.text, fontWeight: '600' },
    stepper: { flexDirection: 'row', alignItems: 'center' },
    stepBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: t.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { fontSize: 24, color: t.text },
    stepValue: { fontSize: 22, fontWeight: '600', color: t.text, minWidth: 64, textAlign: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
    chip: { backgroundColor: t.chip, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    chipText: { color: t.text, fontSize: 14 },
    barcode: { color: t.muted, fontSize: 13, marginTop: 16 },
    primaryBtn: { backgroundColor: t.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    primaryBtnText: { color: t.primaryText, fontSize: 17, fontWeight: '600' },
    deleteBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    deleteText: { color: t.danger, fontSize: 16 },
  });
