import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as inv from './inventory';
import type { PantryItem } from './types';

const STORAGE_KEY = 'mypantry.items.v1';

type Store = {
  items: PantryItem[];
  loaded: boolean;
  add: (input: inv.AddInput) => void;
  adjust: (id: string, delta: number) => void;
  update: (id: string, patch: Partial<PantryItem>) => void;
  remove: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw && !dirty.current) setItems(JSON.parse(raw) as PantryItem[]);
      })
      .catch((e) => console.warn('Could not load inventory', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || !dirty.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((e) =>
      console.warn('Could not save inventory', e),
    );
  }, [items, loaded]);

  const mutate = useCallback((fn: (prev: PantryItem[]) => PantryItem[]) => {
    dirty.current = true;
    setItems(fn);
  }, []);

  const store = useMemo<Store>(
    () => ({
      items,
      loaded,
      add: (input) => mutate((p) => inv.addItem(p, input)),
      adjust: (id, delta) => mutate((p) => inv.adjustQuantity(p, id, delta)),
      update: (id, patch) => mutate((p) => inv.updateItem(p, id, patch)),
      remove: (id) => mutate((p) => inv.removeItem(p, id)),
    }),
    [items, loaded, mutate],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useInventory(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useInventory must be used inside InventoryProvider');
  return s;
}
