export type Location = 'fridge' | 'freezer' | 'pantry';

export const LOCATIONS: { key: Location; label: string; emoji: string }[] = [
  { key: 'fridge', label: 'Fridge', emoji: '🧊' },
  { key: 'freezer', label: 'Freezer', emoji: '❄️' },
  { key: 'pantry', label: 'Pantry', emoji: '🥫' },
];

export type PantryItem = {
  id: string;
  name: string;
  brand?: string;
  /** Package size as printed, e.g. "500 g". */
  size?: string;
  barcode?: string;
  imageUrl?: string;
  location: Location;
  quantity: number;
  /** ISO date (YYYY-MM-DD), optional. */
  expiresOn?: string;
  addedAt: number;
  updatedAt: number;
};

/** What we know about a product before it becomes an inventory item. */
export type ProductInfo = {
  name: string;
  brand?: string;
  size?: string;
  imageUrl?: string;
  barcode?: string;
  /** Best guess at where it is stored, from the product's categories. */
  suggestedLocation?: Location;
};
