import type { Location, ProductInfo } from './types';

// Open Food Facts is a free, open product database: no account or API key.
// They ask apps to send a descriptive User-Agent.
const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS = 'product_name,generic_name,brands,quantity,image_front_small_url,image_url,categories_tags';
const USER_AGENT = 'MyPantry/1.0 (family pantry tracker)';

type OffProduct = {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  image_front_small_url?: string;
  image_url?: string;
  categories_tags?: string[];
};

type OffResponse = { status?: number; product?: OffProduct };

const FREEZER_HINTS = ['frozen', 'ice-cream', 'ice-creams'];
const FRIDGE_HINTS = [
  'dairies', 'dairy', 'milks', 'cheeses', 'yogurts', 'butters', 'eggs', 'creams',
  'meats', 'poultry', 'fishes', 'seafood', 'fresh', 'hams', 'sausages',
  'fruit-juices', 'refrigerated', 'tofu', 'hummus', 'salads',
];

export function guessLocation(categories: string[] = []): Location | undefined {
  const tags = categories.map((c) => c.toLowerCase().replace(/^[a-z]{2}:/, ''));
  const has = (hints: string[]) => tags.some((t) => hints.some((h) => t === h || t.includes(h)));
  if (has(FREEZER_HINTS)) return 'freezer';
  if (has(FRIDGE_HINTS)) return 'fridge';
  return tags.length ? 'pantry' : undefined;
}

/** Turn an Open Food Facts response into ProductInfo, or null if not found. */
export function parseOffResponse(barcode: string, json: OffResponse): ProductInfo | null {
  const p = json.product;
  if (json.status !== 1 || !p) return null;
  const name = (p.product_name || p.generic_name || '').trim();
  if (!name) return null;
  const brand = p.brands?.split(',')[0]?.trim() || undefined;
  return {
    name,
    brand,
    size: p.quantity?.trim() || undefined,
    imageUrl: p.image_front_small_url || p.image_url || undefined,
    barcode,
    suggestedLocation: guessLocation(p.categories_tags),
  };
}

/**
 * Look up a barcode. Returns null when the product is unknown;
 * throws when the network request fails, so the caller can tell the two apart.
 */
export async function lookupBarcode(barcode: string, timeoutMs = 8000): Promise<ProductInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${OFF_URL}${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
    return parseOffResponse(barcode, (await res.json()) as OffResponse);
  } finally {
    clearTimeout(timer);
  }
}
