# 06 — Expo setup, navigation and design tokens

**Label:** FE · **Phase:** 1 · **Depends on:** 01 · **Size:** ~6–8 h

## Goal
An Expo app that runs on your phone and in the browser with tab navigation and a small design-token system, using the same layout on both.

## You will learn
- Expo and file-based routing (Expo Router)
- React Native layout (flexbox, no CSS cascade) and how React Native Web maps it to the browser
- Design tokens: one source for colors, spacing and type

## Build
- [ ] Create the app in `apps/mobile/` with TypeScript and Expo Router. Run it in Expo Go (or a dev build), in an iOS/Android simulator, and in the browser.
- [ ] Tabs: Home (recap), Transactions, Add, Chat, Settings. Screens can be placeholders.
- [ ] Web layout: constrain the content to a phone-width column centered on large screens, so the web version matches the mobile layout.
- [ ] A `theme` module with color, spacing, radius and typography tokens. Resolve the TBD values from the old design notes: one indigo accent, tinted neutrals, six category colors that are color-blind-safe, success/amber/red status colors. Check contrast ratios.
- [ ] A few base components: `Screen`, `Text`, `Button`, `Card`, `Money` (formats IDR with tabular numerals).
- [ ] Light and dark support, or an explicit decision to defer dark mode.

## Done when
- The same screens render on phone and in a desktop browser with the same layout.
- Components use tokens only (no hard-coded colors in screens).

## Tests
- Unit test for `Money` formatting (for example 1500000 → "Rp 1.500.000", zero, negatives).
- A simple render test for the base components.

## Pitfalls
- Web-only or native-only APIs that break on the other platform. Test both early.
- Hard-coding colors and spacing everywhere; refactoring later is painful.
- Inaccessible tap targets: keep at least 44×44 points.

## Read
- Expo Router docs; React Native layout docs; WCAG contrast guidelines
