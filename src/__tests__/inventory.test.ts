/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addItem, adjustQuantity, daysUntil, isValidIsoDate, matchesSearch, sortItems } from '../inventory.ts';
import type { PantryItem } from '../types.ts';

const milk = { name: 'Whole Milk', brand: 'Acme', barcode: '0001', location: 'fridge' as const, quantity: 1 };

test('adding the same barcode to the same place bumps quantity', () => {
  let items: PantryItem[] = [];
  items = addItem(items, milk, 1);
  items = addItem(items, { ...milk, quantity: 2 }, 2);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].updatedAt, 2);
});

test('same barcode in a different place is a separate row', () => {
  let items = addItem([], milk);
  items = addItem(items, { ...milk, location: 'freezer' });
  assert.equal(items.length, 2);
});

test('items without barcodes merge on name + brand, case-insensitively', () => {
  let items = addItem([], { name: 'Bananas', location: 'pantry', quantity: 3 });
  items = addItem(items, { name: ' bananas ', location: 'pantry', quantity: 2 });
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 5);
  // A hand-typed item never merges with a scanned one.
  items = addItem(items, { name: 'Bananas', barcode: '999', location: 'pantry', quantity: 1 });
  assert.equal(items.length, 2);
});

test('merging keeps the earliest expiry date', () => {
  let items = addItem([], { ...milk, expiresOn: '2026-12-10' });
  items = addItem(items, { ...milk, expiresOn: '2026-12-01' });
  assert.equal(items[0].expiresOn, '2026-12-01');
  items = addItem(items, { ...milk });
  assert.equal(items[0].expiresOn, '2026-12-01');
});

test('using the last one removes the item', () => {
  let items = addItem([], { ...milk, quantity: 2 });
  const id = items[0].id;
  items = adjustQuantity(items, id, -1);
  assert.equal(items[0].quantity, 1);
  items = adjustQuantity(items, id, -1);
  assert.equal(items.length, 0);
});

test('daysUntil counts calendar days', () => {
  const today = new Date(2026, 10, 18, 23, 30);
  assert.equal(daysUntil('2026-11-18', today), 0);
  assert.equal(daysUntil('2026-11-21', today), 3);
  assert.equal(daysUntil('2026-11-17', today), -1);
  assert.equal(daysUntil('2027-01-01', today), 44);
});

test('date validation', () => {
  assert.ok(isValidIsoDate('2026-02-28'));
  assert.ok(!isValidIsoDate('2026-02-30'));
  assert.ok(!isValidIsoDate('2026-2-3'));
  assert.ok(!isValidIsoDate('tomorrow'));
});

test('search matches name, brand, or barcode', () => {
  const [item] = addItem([], milk);
  assert.ok(matchesSearch(item, 'milk'));
  assert.ok(matchesSearch(item, 'ACME'));
  assert.ok(matchesSearch(item, '0001'));
  assert.ok(matchesSearch(item, ''));
  assert.ok(!matchesSearch(item, 'eggs'));
});

test('sort puts soonest expiry first, undated items last', () => {
  let items = addItem([], { name: 'A', location: 'pantry', quantity: 1 }, 1);
  items = addItem(items, { name: 'B', location: 'pantry', quantity: 1, expiresOn: '2026-12-05' }, 2);
  items = addItem(items, { name: 'C', location: 'pantry', quantity: 1, expiresOn: '2026-11-20' }, 3);
  assert.deepEqual(sortItems(items).map((i) => i.name), ['C', 'B', 'A']);
});
