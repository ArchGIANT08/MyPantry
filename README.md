# MyPantry

A phone app for keeping track of what's in your fridge, freezer and pantry.
Scan a barcode and the item goes on the list.

## What it does

- **Barcode scanner.** Point the camera at a grocery barcode (UPC/EAN). The app looks the product up in
  [Open Food Facts](https://world.openfoodfacts.org), a free, open product database, and fills in the
  name, brand, size and picture. It also guesses where the item goes (milk goes in the fridge, frozen
  peas in the freezer, pasta in the pantry). You can change any of it before adding.
- **Remembers what you've scanned.** Scan something you already have and it skips the lookup, tells you
  how many you've got, and adds to the count instead of making a duplicate row. Products the database
  doesn't know get remembered once you type a name.
- **Inventory list.** Filter by Fridge / Freezer / Pantry, search, and tap − / + as things get used up.
  An item disappears when its count reaches 0. Tap an item to edit or remove it.
- **Use-by dates (optional).** Quick buttons for 3 days, 1 week, 2 weeks or 1 month. Items that expire
  soonest show first, with an orange label when they have 3 days or fewer left.
- **Manual add.** Use "Type it in" on the scanner, or the + button on the list, for things without a barcode.
- Includes a flashlight toggle for dark cupboards, and supports dark mode.

## Try it on your phone (no app store needed)

1. Install **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) /
   [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
2. On a computer with [Node.js](https://nodejs.org) 20 or newer:
   ```bash
   git clone https://github.com/ArchGIANT08/MyPantry.git
   cd MyPantry
   npm install
   npx expo start
   ```
3. Scan the QR code shown in the terminal. On iPhone, use the Camera app; on Android, use Expo Go.
   The phone and computer need to be on the same Wi-Fi. If they aren't, run `npx expo start --tunnel`.

## Install it for the whole family

Expo Go is fine for trying the app. To get a real app icon on everyone's phone, build it with
[EAS Build](https://docs.expo.dev/build/introduction/). It runs in the cloud, so you don't need a Mac:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview   # gives you an .apk download link
```

On iPhone, installing outside the App Store needs an Apple Developer account. Use
[internal distribution](https://docs.expo.dev/build/internal-distribution/) or TestFlight.

## Current limitation: each phone has its own list

The inventory is saved on the device. The data structures are ready for a shared household list, but a
shared list needs a small cloud database (for example Firebase or Supabase) so every phone sees the same
items. That's the planned next step.

## Development

```bash
npm start            # Expo dev server
npm run typecheck    # TypeScript
npm test             # unit tests (inventory logic + barcode lookup parsing)
```

Code layout:

| Path | What's there |
| --- | --- |
| `App.tsx` | App shell: header and the Scan / Inventory tabs |
| `src/screens/ScanScreen.tsx` | Camera, barcode handling, lookup |
| `src/screens/InventoryScreen.tsx` | List, filters, search, quantity buttons |
| `src/components/ItemForm.tsx` | Add/edit sheet |
| `src/inventory.ts` | Inventory logic (merging duplicates, quantities, dates), with no UI code |
| `src/productLookup.ts` | Open Food Facts lookup and fridge/freezer/pantry guess |
| `src/store.tsx` | React state, saved to device storage |
