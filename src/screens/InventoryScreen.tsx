import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ItemForm, type FormValues } from '../components/ItemForm';
import { daysUntil, matchesSearch, sortItems } from '../inventory';
import { useInventory } from '../store';
import { useTheme, type Theme } from '../theme';
import { LOCATIONS, type Location, type PantryItem } from '../types';

type Filter = Location | 'all';

export function InventoryScreen({ onScanPress }: { onScanPress: () => void }) {
  const t = useTheme();
  const s = styles(t);
  const { items, loaded, adjust, update, remove, add } = useInventory();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, fridge: 0, freezer: 0, pantry: 0 };
    items.forEach((i) => (c[i.location] += 1));
    return c;
  }, [items]);

  const visible = useMemo(
    () => sortItems(items.filter((i) => (filter === 'all' || i.location === filter) && matchesSearch(i, query))),
    [items, filter, query],
  );

  const saveEdit = (v: FormValues) => {
    if (!editing) return;
    update(editing.id, {
      name: v.name,
      brand: v.brand,
      size: v.size,
      location: v.location,
      quantity: v.quantity,
      expiresOn: v.expiresOn,
    });
    setEditing(null);
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    ...LOCATIONS.map((l) => ({ key: l.key, label: `${l.emoji} ${l.label}` })),
  ];

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search your kitchen"
          placeholderTextColor={t.muted}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        <View style={s.filters}>
          {filters.map((f) => (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[s.filter, filter === f.key && s.filterOn]}>
              <Text style={[s.filterText, filter === f.key && s.filterTextOn]}>
                {f.label} {counts[f.key] ? `· ${counts[f.key]}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={visible.length ? s.list : s.listEmpty}
        renderItem={({ item }) => (
          <Row item={item} t={t} onPress={() => setEditing(item)} onAdjust={(d) => adjust(item.id, d)} />
        )}
        ListEmptyComponent={
          loaded ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🛒</Text>
              <Text style={s.emptyTitle}>{items.length ? 'Nothing matches' : 'Your kitchen is empty'}</Text>
              {!items.length && (
                <>
                  <Text style={s.emptyText}>Scan a barcode to add your first item.</Text>
                  <Pressable style={s.emptyBtn} onPress={onScanPress}>
                    <Text style={s.emptyBtnText}>Start scanning</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : undefined
        }
      />

      <Pressable style={s.fab} onPress={() => setAdding(true)} accessibilityLabel="Add item by hand">
        <Text style={s.fabText}>＋</Text>
      </Pressable>

      <ItemForm
        visible={!!editing}
        title="Edit item"
        initial={editing ?? { name: '', location: 'pantry', quantity: 1 }}
        onSubmit={saveEdit}
        onCancel={() => setEditing(null)}
        onDelete={() => {
          if (editing) remove(editing.id);
          setEditing(null);
        }}
      />
      <ItemForm
        visible={adding}
        title="Add item"
        submitLabel="Add"
        initial={{ name: '', location: filter === 'all' ? 'pantry' : filter, quantity: 1 }}
        onSubmit={(v) => {
          add(v);
          setAdding(false);
        }}
        onCancel={() => setAdding(false)}
      />
    </View>
  );
}

function Row({ item, t, onPress, onAdjust }: { item: PantryItem; t: Theme; onPress: () => void; onAdjust: (d: number) => void }) {
  const s = styles(t);
  const loc = LOCATIONS.find((l) => l.key === item.location)!;
  const sub = [item.brand, item.size].filter(Boolean).join(' · ');
  const days = item.expiresOn ? daysUntil(item.expiresOn) : undefined;

  let badge: { text: string; bg: string; fg: string } | null = null;
  if (days !== undefined) {
    if (days < 0) badge = { text: 'Expired', bg: t.dangerBg, fg: t.danger };
    else if (days === 0) badge = { text: 'Today', bg: t.dangerBg, fg: t.danger };
    else if (days <= 3) badge = { text: `${days}d left`, bg: t.warnBg, fg: t.warn };
    else badge = { text: `${days}d`, bg: t.chip, fg: t.muted };
  }

  return (
    <Pressable style={s.row} onPress={onPress}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={s.thumb} />
      ) : (
        <View style={[s.thumb, s.thumbEmpty]}>
          <Text style={{ fontSize: 22 }}>{loc.emoji}</Text>
        </View>
      )}
      <View style={s.rowMain}>
        <Text style={s.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={s.rowMeta}>
          {sub ? (
            <Text style={s.rowSub} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
          {badge ? (
            <View style={[s.badge, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={s.qty}>
        <Pressable style={s.qtyBtn} onPress={() => onAdjust(-1)} hitSlop={6} accessibilityLabel={`Use one ${item.name}`}>
          <Text style={s.qtyBtnText}>−</Text>
        </Pressable>
        <Text style={s.qtyValue}>{item.quantity}</Text>
        <Pressable style={s.qtyBtn} onPress={() => onAdjust(1)} hitSlop={6} accessibilityLabel={`Add one ${item.name}`}>
          <Text style={s.qtyBtnText}>+</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    top: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    search: {
      backgroundColor: t.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 16,
      color: t.text,
    },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    filter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: t.chip },
    filterOn: { backgroundColor: t.primary },
    filterText: { color: t.text, fontSize: 14 },
    filterTextOn: { color: t.primaryText, fontWeight: '600' },
    list: { padding: 16, paddingBottom: 100, gap: 8 },
    listEmpty: { flexGrow: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: t.chip },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
    rowMain: { flex: 1, marginHorizontal: 12 },
    rowName: { fontSize: 16, fontWeight: '600', color: t.text },
    rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
    rowSub: { fontSize: 13, color: t.muted, flexShrink: 1 },
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    qty: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.chip, alignItems: 'center', justifyContent: 'center' },
    qtyBtnText: { fontSize: 18, color: t.text },
    qtyValue: { minWidth: 30, textAlign: 'center', fontSize: 16, fontWeight: '600', color: t.text },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyEmoji: { fontSize: 48, marginBottom: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: t.text },
    emptyText: { fontSize: 15, color: t.muted, marginTop: 6, textAlign: 'center' },
    emptyBtn: { marginTop: 18, backgroundColor: t.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
    emptyBtnText: { color: t.primaryText, fontSize: 16, fontWeight: '600' },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    fabText: { fontSize: 28, color: t.primaryText, marginTop: -2 },
  });
