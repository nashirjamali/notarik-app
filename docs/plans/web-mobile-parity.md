# Plan: web app with the same menus and screens as the mobile app

**Goal.** The signed-in web app (`apps/web`, `/app/*`) offers the same menu and the same screens as the Expo app (`apps/mobile`). Below the tablet breakpoint (under 768 px, "mobile layout") it looks like the mobile app: same components, spacing, bottom pill navigation, sheets and top bars. From 768 px up ("web layout") it keeps the same menu and the same flows, laid out for a wide screen.

Source of truth for looks: the Expo app (also running as Expo web on :8081 for side-by-side checks) and the Figma file "Notarik".

## 1. What differs today

| | Mobile app | Web app today |
|---|---|---|
| Menu | Home, Transactions, **+ Add**, Chat, Settings (floating dark pill) | Home, Transactions, Recap, Ask Notarik, Settings (sidebar / top bar / plain bottom bar) |
| Home | Hero "Snap it. We'll sort it.", Snap receipt + Ask Notarik cards, 4 shortcut tiles (Quick add, Recap, Budget, Transactions), "Try asking" chips | Different layout, no shortcuts |
| Add | **Quick add**: type a sentence ("makan siang 35rb di warteg"), parsed rows, category sheet; Snap receipt and Voice buttons | Single form page |
| Snap receipt | Camera, gallery, PDF, then a review screen | File picker, review form |
| Chat | Own tab with bubbles, composer with scan button | "Ask Notarik" page |
| Recap | Opened from Home; "Recap & Budget" plus a separate Edit budgets screen | A menu item; budget edited inline |
| Settings | Account card, Notarik AI toggles, Preferences, Money (Categories sheet, Budgets, Export), About (Help and Privacy sheets, Version) | Account and two switches |
| Patterns | Top bar with back, bottom sheets, avatar, tinted icon tiles | Cards and pages |

## 2. Decisions (defaults chosen, change any)

1. **Breakpoint.** Under 768 px: pixel-faithful mobile look. At 768 px and up: same menu entries and screens, wide layout.
2. **Wide-screen navigation.** A sidebar with the same five entries in the same order (Add is the primary button). The alternative is the mobile column (max 430 px) centered on the page, as Expo web does now. Recommended: sidebar, because a phone column on a 27" screen wastes the space and the owner asked for a web layout.
3. **Recap and Ask leave the menu.** Recap is reached from Home ("Recap", "Budget" tiles) and Settings > Budgets. "Ask Notarik" becomes **Chat** at `/app/chat`; `/app/ask` redirects to it. `/app/recap` keeps its URL.
4. **Assets.** Copy the mobile SVG/PNG assets (nav icons, settings icons, shortcut icons, mascot marks) into `apps/web/public`. One script, not hand-copied files, so a design update is one command.
5. **Pure logic stays pure.** `quickAdd`, `numberWords`, `group`, `months`, `money` from `apps/mobile/src/lib` are plain TypeScript; port with their tests. Revisit a shared `packages/` folder only if the copies start to drift.
6. **Not on web (hidden, not faked):** Voice input (no stable cross-browser API), the notification bell (does nothing on mobile either), and live camera (use the file input with `capture`, which opens the camera on phones).

## 3. Work, in order (one PR each, each merged before the next)

**PR 1. Foundations and shell. (done)**
- Token check: compare `apps/mobile/src/theme/tokens.ts` with `globals.css` (colors, type scale, spacing, radii); fix drift.
- Asset sync script and the assets.
- New shell: floating dark pill bottom nav with the active circle and the raised **+** (under 768 px); sidebar with the same entries (768 px and up); `TopBar` (title, back, right action) and `BottomSheet` components.
- Built: `sync:assets`, nav pill + sidebar, centered mobile title in `PageTitle` (a full `TopBar` with back button lands with the first screen that needs it), Log out in Settings under 768 px. `BottomSheet` moves to PR 4 (Quick add category sheet), its first user. Menu renamed and reordered; `/app/chat` route and `/app/ask` redirect. Tests for nav at 390 / 768 / 1440.

**PR 2. Home. (done)** Hero, two action cards, four shortcut tiles, "Try asking Notarik" chips that open Chat with the prompt.

**PR 3. Transactions list. (done)** **PR 3b (detail screen) is done too:** `TopBar`, `OptionSheet` (a `<dialog>`: bottom sheet under 768px, centered dialog above), More menu, inline note, receipt viewer, expandable items, delete confirmation. The detail screen moved to a PR 3b right after (it has its own menu, option sheets, receipt viewer and delete confirmation).

*Original scope:* Transactions and detail. TopBar with search toggle, "Spent" summary, category chips, day groups; detail screen with edit/delete as on mobile (`transactions/[id].tsx`). Keeps CSV export (moves under Settings > Export data as on mobile, a shortcut can stay).

**PR 4. Add flow. (done, with two gaps)** Quick add (parser ported with its 100 mobile tests, several expenses at once, category sheet), the dark Snap screen with Gallery / Take photo / PDF, and a Review header with Retake and Discard. Gaps: the review fields are still the shared form rather than the mobile review layout (editable item rows, flagged items), and Voice is not shown. The category chips use dark text on their colour: white on the orange and yellow chips fails 4.5:1.

*Original scope:* Quick add (sentence, parsed rows, category sheet, save), then Snap receipt (gallery, PDF, camera capture) and the receipt review screen. Replaces today's add and scan pages.

**PR 5. Chat. (done)** Top bar with New chat, greeting from the profile name, avatar bubbles, typing dots, the structured proposal card (Edit then Save / Cancel, Delete, Set budget; a newer proposal marks the old one "Replaced by a newer request"), "View expense" link, composer with scan button. The old Confirm/Cancel summary card is gone.

*Original scope:* Mobile layout of the thread and composer (scan button, send), suggestion prompts via `?prompt=`, confirm/cancel cards styled like `ChatParts`.

**PR 6. Recap and budgets. (done)** Recap & Budget with the ring, insight, and by-category list; a separate Edit budgets screen at `/app/recap/edit?month=` (monthly plus one limit per category, empty = no limit). The inline budget editor is gone; Projection stays on the wide layout only.

*Original scope:* "Recap & Budget" screen and a separate "Edit budgets" screen (monthly and per category), as on mobile.

**PR 7. Settings.** Account card with avatar, grouped rows (Notarik AI, Preferences, Money, About), Categories / Help / Privacy sheets, Export data, Log out.

**PR 8. Auth screens.** Onboarding/landing entry, login and signup to match the mobile screens (Google button stays).

**PR 9. Cleanup.** Remove unused old components, update `docs/steps/26`, `apps/web/README.md`, run Lighthouse again.

## 4. How each PR is checked
- Playwright at 390, 768 and 1440: menu entries, routes, no horizontal scroll.
- Axe audit on every screen (existing suite, new routes added).
- **Visual check against the mobile app:** a script screenshots each screen in the Expo web build (:8081) and in the Next app at 390 px with the same seeded data, and I compare them side by side. Differences are fixed or listed in the PR. No automatic pixel diff at first (fonts and anti-aliasing differ); add one with a tolerance only if it proves useful.
- Existing e2e flows (login, expense CRUD, chat confirm, receipt, settings, Google) keep passing, with selectors updated to the new labels.

## 5. Risks and open points
- **Largest cost is fidelity**, not features: React Native styles do not map one to one to CSS (shadows, font metrics, safe areas). Budget time for visual tuning in each PR.
- Cache Components: the shell reads the pathname on the client, so keep it inside `Suspense` as it is now.
- Chat and Add flows now live in several screens; the e2e suite needs rewriting around the new routes, not just renaming.
- Two spots that need a call from the owner before PR 1: wide-screen navigation (decision 2) and whether voice should be hidden or shown disabled (decision 6).
