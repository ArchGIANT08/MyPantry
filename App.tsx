import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { InventoryProvider, useInventory } from './src/store';
import { useTheme } from './src/theme';

type Tab = 'inventory' | 'scan';

export default function App() {
  return (
    <SafeAreaProvider>
      <InventoryProvider>
        <Shell />
      </InventoryProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>('scan');
  const { items } = useInventory();
  const total = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>MyPantry</Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>
          {total} {total === 1 ? 'item' : 'items'} at home
        </Text>
      </View>

      <View style={styles.content}>
        {/* Keep both mounted so search/filter state survives tab switches;
            the camera itself only runs while the Scan tab is showing. */}
        <View style={[styles.fill, tab !== 'inventory' && styles.hidden]}>
          <InventoryScreen onScanPress={() => setTab('scan')} />
        </View>
        <View style={[styles.fill, tab !== 'scan' && styles.hidden]}>
          <ScanScreen active={tab === 'scan'} />
        </View>
      </View>

      <View style={[styles.tabs, { borderTopColor: t.border, backgroundColor: t.card }]}>
        <TabButton label="Scan" icon="📷" on={tab === 'scan'} onPress={() => setTab('scan')} />
        <TabButton label="Inventory" icon="📋" on={tab === 'inventory'} onPress={() => setTab('inventory')} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, icon, on, onPress }: { label: string; icon: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable style={styles.tab} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }}>
      <Text style={[styles.tabIcon, { opacity: on ? 1 : 0.5 }]}>{icon}</Text>
      <Text style={[styles.tabLabel, { color: on ? t.primary : t.muted, fontWeight: on ? '700' : '500' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  content: { flex: 1 },
  fill: { ...StyleSheet.absoluteFill },
  hidden: { display: 'none' },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 12, marginTop: 2 },
});
