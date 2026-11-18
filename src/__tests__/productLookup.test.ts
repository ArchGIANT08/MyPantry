/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guessLocation, parseOffResponse } from '../productLookup.ts';

test('parses a found product', () => {
  const p = parseOffResponse('3017624010701', {
    status: 1,
    product: {
      product_name: 'Nutella',
      brands: 'Ferrero, Nutella',
      quantity: '400 g',
      image_front_small_url: 'https://images.example/nutella.jpg',
      categories_tags: ['en:spreads', 'en:sweet-spreads', 'en:hazelnut-spreads'],
    },
  });
  assert.deepEqual(p, {
    name: 'Nutella',
    brand: 'Ferrero',
    size: '400 g',
    imageUrl: 'https://images.example/nutella.jpg',
    barcode: '3017624010701',
    suggestedLocation: 'pantry',
  });
});

test('falls back to generic name; missing name means not found', () => {
  assert.equal(parseOffResponse('1', { status: 1, product: { generic_name: 'Milk' } })?.name, 'Milk');
  assert.equal(parseOffResponse('1', { status: 1, product: { brands: 'Acme' } }), null);
  assert.equal(parseOffResponse('1', { status: 0 }), null);
});

test('guesses where things live from categories', () => {
  assert.equal(guessLocation(['en:dairies', 'en:milks']), 'fridge');
  assert.equal(guessLocation(['en:frozen-foods', 'en:frozen-pizzas']), 'freezer');
  assert.equal(guessLocation(['en:ice-creams']), 'freezer');
  assert.equal(guessLocation(['en:pastas', 'en:dry-pastas']), 'pantry');
  assert.equal(guessLocation([]), undefined);
});
