import type { Location, PantryItem, ProductInfo } from './types';

// Pure inventory logic, kept free of React and storage so it can be unit tested.

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export type AddInput = ProductInfo & {
  location: Location;
  quantity: number;
  expiresOn?: string;
};

/**
 * Add an item. If the same product (same barcode, or same name + brand when
 * there is no barcode) is already in the same location, bump its quantity
 * instead of creating a duplicate row.
 */
export function addItem(items: PantryItem[], input: AddInput, now = Date.now()): PantryItem[] {
  const match = items.find((i) => i.location === input.location && sameProduct(i, input));
  if (match) {
    return items.map((i) =>
      i.id === match.id
        ? {
            ...i,
            quantity: i.quantity + input.quantity,
            expiresOn: earliest(i.expiresOn, input.expiresOn),
            updatedAt: now,
          }
        : i,
    );
  }
  const item: PantryItem = {
    id: newId(),
    name: input.name.trim(),
    brand: input.brand?.trim() || undefined,
    size: input.size?.trim() || undefined,
    barcode: input.barcode,
    imageUrl: input.imageUrl,
    location: input.location,
    quantity: input.quantity,
    expiresOn: input.expiresOn || undefined,
    addedAt: now,
    updatedAt: now,
  };
  return [item, ...items];
}

function sameProduct(item: PantryItem, input: ProductInfo): boolean {
  if (item.barcode && input.barcode) return item.barcode === input.barcode;
  if (item.barcode || input.barcode) return false;
  const norm = (s?: string) => (s ?? '').trim().toLowerCase();
  return norm(item.name) === norm(input.name) && norm(item.brand) === norm(input.brand);
}

function earliest(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

/** Change quantity by delta. Items that reach zero are removed. */
export function adjustQuantity(items: PantryItem[], id: string, delta: number, now = Date.now()): PantryItem[] {
  return items
    .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta, updatedAt: now } : i))
    .filter((i) => i.quantity > 0);
}

export function updateItem(items: PantryItem[], id: string, patch: Partial<PantryItem>, now = Date.now()): PantryItem[] {
  return items.map((i) => (i.id === id ? { ...i, ...patch, id: i.id, updatedAt: now } : i));
}

export function removeItem(items: PantryItem[], id: string): PantryItem[] {
  return items.filter((i) => i.id !== id);
}

export function findByBarcode(items: PantryItem[], barcode: string): PantryItem[] {
  return items.filter((i) => i.barcode === barcode);
}

/** Whole days from today until the expiry date (negative = expired). */
export function daysUntil(isoDate: string, today = new Date()): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - start) / 86_400_000);
}

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function matchesSearch(item: PantryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.brand, item.barcode].some((f) => f?.toLowerCase().includes(q));
}

/** Expiring soonest first, then most recently updated. */
export function sortItems(items: PantryItem[]): PantryItem[] {
  return [...items].sort((a, b) => {
    if (a.expiresOn && b.expiresOn && a.expiresOn !== b.expiresOn) return a.expiresOn < b.expiresOn ? -1 : 1;
    if (a.expiresOn && !b.expiresOn) return -1;
    if (!a.expiresOn && b.expiresOn) return 1;
    return b.updatedAt - a.updatedAt;
  });
}
