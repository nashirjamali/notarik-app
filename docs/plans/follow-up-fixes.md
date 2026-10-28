# Plan: three follow-ups after multi Quick add

Status: **plan only, nothing built.** Three separate pieces of work, ordered from smallest to largest. They do not depend on each other, so each can be its own branch and PR.

| # | Piece | Size | Type |
|---|-------|------|------|
| A | Home shortcut row: the "Transactions" label breaks mid-word, and the tiles drift from Figma | small | fix |
| B | Edit budgets sheet: the keyboard pushes it off screen, as Quick add did | medium | fix |
| C | Quick add by voice, numbers written as words, and an optional LLM read for messy text | large | feature |

Recommended order: **A, then B, then C** (C in the three parts below, the last one only after an eval set exists).

---

## A. Home shortcut row

### What is wrong

- "Transactions" wraps to "Transactio / ns" on the Home shortcuts (`apps/mobile/src/components/ShortcutTile.tsx`, used in `app/(app)/(tabs)/index.tsx`).
- Cause: each tile is a fixed 72 wide inside a horizontal `ScrollView`, and the label (Poppins SemiBold 12) is about 78 wide, so it breaks inside the word.
- Compared with the Figma "Menu Tiles" (frame 533:303 / `Menu Tiles` in Home), the row also differs in other ways, so the label should be fixed by matching the design, not by a patch:

| | Figma | Code today |
|---|-------|-----------|
| Layout | 4 equal columns across the 342 wide row, 8 gap | 4 fixed 72 wide tiles in a horizontal scroll row |
| Icon tile | 60 x 60, radius 12 | 64 x 64, radius 14 |
| 3D icon | 46 x 46 | 48 x 48 |
| Tints | Quick add `#F0E6FF`, Recap `#CFE5FF`, Budget `#DAFBE6`, Transactions `#F8E8C9` | `#E9E3F4`, `#D9EAF4`, `#D9F2E6`, `#FEF0DC` |
| Label | Poppins SemiBold 12/20, **one line** (`whitespace-nowrap`), centred, 8 below the tile | wraps |

### The fix

1. `ShortcutTile`: `flex: 1` instead of a fixed width, icon tile 60 and 3D icon 46, radius 12, the four design tints, label `numberOfLines={1}`.
2. The row becomes a plain `View` with `gap: 8` and the same 24 side padding as the other sections. No scroll: four tiles always fit.
3. A label that still does not fit on a narrow phone (320 wide gives about 62 per tile) shrinks instead of breaking: `adjustsFontSizeToFit` with `minimumFontScale` around 0.8 on iOS and Android. On web the text stays on one line.
4. Cap the label's font scaling for people with a large system font (`maxFontSizeMultiplier` around 1.2), so the row cannot break.
5. The 3D icons keep their current files; only sizes change.

### Done when

- On the iPhone 13 simulator the four labels are one line and the row matches the Figma screenshot (compare against `get_screenshot` of the Home frame).
- On a 320 wide simulator (iPhone SE) nothing breaks mid-word.
- The existing Home e2e tests stay green; no new e2e is needed.

### Risk

Tint colours are hard-coded in the screen today. Put them in the theme tokens if they exist there; otherwise keep them next to the tiles and note it.

---

## B. Edit budgets sheet

### What is wrong

`app/(app)/edit-budgets.tsx` is the older sheet pattern that Quick add had before PR #15: a fixed height (`min(680, height - 120)`) inside a `KeyboardAvoidingView` with `padding`. Both budget fields use a numeric keyboard, so tapping one opens the keyboard and the padding pushes a tall sheet up past the status bar, hiding the title and the top fields. This has to be reproduced on the simulator first (step B0), since it is expected, not yet seen.

There is no Figma frame for this sheet; it was built from the Quick add sheet, so the look stays as it is and only the behaviour changes.

### The fix

1. **Extract a shared `BottomSheet`** from `quick-add.tsx` into `src/components/BottomSheet.tsx`. It owns what Quick add already does well:
   - scrim that fades with the sheet, tap on it closes;
   - slide in and out (close animates first, then leaves the route);
   - pull the top down to close;
   - the sheet sits on top of the keyboard and is never taller than the room under the status bar (Figma's 664 as the upper bound);
   - height follows content, measured, so there is no empty gap above the buttons.
2. Props: `onClose`, `header` (title and the close button, so both sheets look the same), `footer` (the sticky Save bar), and `children` (the scrolling content).
3. Move Quick add onto it, then Edit budgets. Quick add's behaviour must not change; its e2e tests and a simulator pass prove that.
4. In Edit budgets replace the text `✕` close button with the same `sheet-x` icon that Quick add uses, so the two sheets match.
5. Keep the route-based modal (`transparentModal`) in `app/(app)/_layout.tsx`, and set `animation: "none"` for `edit-budgets` as for `quick-add`.

### Tests

- Existing e2e for Edit budgets (inside "recap and budget: ring, categories and editing the budgets") and for Quick add stay green.
- A jest test for the pure part: the sheet height rule `min(max(height - 180, 480), room above)` as a small function with a few screen heights.
- Simulator, by hand: open Edit budgets, tap a field, check that the title stays visible and Save sits above the keyboard; pull down to close.

### Done when

On the iPhone 13 simulator with the keyboard up, Edit budgets keeps its title and Save on screen, scrolls its fields, and closes by the X, the scrim and a pull down, exactly like Quick add.

### Risk

Refactoring a sheet that works (Quick add) can break it. Do it in small commits: extract with Quick add as the only user first, verify, then move Edit budgets.

---

## C. Quick add: voice, number words, and a smarter read

Today the sheet has a "Voice" button that only says "Voice entry is not available yet", and the parser (`apps/mobile/src/lib/quickAdd.ts`) understands digits only. The three parts below build on each other and share one rule: **everything ends up as text in the same box, then in the same editable list, and nothing is saved until the person taps Save.**

### C1. Numbers written as words (do this first)

Speech and fast typing give words, not digits: `kopi dua puluh lima ribu`, `parkir lima ribu`, `bayar kos satu setengah juta`.

- New pure function `wordsToDigits(text)` in `src/lib/` (Indonesian first, a few English forms): `satu` to `sembilan`, `sepuluh`, `sebelas`, `belasan`, `puluh`, `ratus`, `ribu`, `juta`, `setengah`, and `seratus`/`seribu` for "one hundred/one thousand".
- `parseQuickAdd` and `splitEntries` call it first, so `kopi dua puluh lima ribu, parkir lima ribu` becomes `kopi 25rb, parkir 5rb` before the existing rules run. Typed text benefits too.
- It must not touch words that merely contain a number word (`satuan`, `sebelah`), and quantities such as `dua kopi 36rb` keep their meaning (the suffixed amount still wins).
- Tests: a table of about 40 spoken and written phrases with the expected amounts, including the cases above. No API or UI changes.

Done when the table passes and the existing `quickAdd` tests are untouched and green.

### C2. Voice into the box

- The existing **Voice** button starts speech recognition; the words fill the same text box live and the list updates as it would while typing. A second tap stops; the person edits the text if needed and taps Save.
- **Option 1 (recommended): on-device recognition** through `expo-speech-recognition` (iOS Speech framework, Android recogniser, and the browser's Web Speech API on Chrome). Free, the audio stays on the device, and the development build is already in place (`npx expo run:ios`). Language `id-ID`, falling back to `en-US`.
- Option 2: record audio and send it to a server speech-to-text route. More control over accuracy, but it costs money per use, sends voice off the device, and needs a new endpoint and a privacy note. Revisit only if on-device accuracy for Indonesian money phrases is poor.
- Needs: microphone and speech-recognition permission strings in `app.json`, a clear message when permission is refused, and hiding the button where the platform has no recogniser (Firefox, for example).
- Voice sets the text only. It does not save, so a mis-heard number is visible in the list before anything is stored.

Tests: the permission and "not supported" states in jest with the module mocked; real recognition is a manual check on the simulator (a Mac microphone) and a physical iPhone. e2e cannot drive speech.

Done when a spoken `kopi dua puluh lima ribu, parkir lima ribu` gives two rows with the right amounts on the iPhone 13 simulator or a device, and refusing the permission shows a message instead of a dead button.

### C3. An LLM read for messy text (after an eval set exists)

For text the rules cannot split (`tadi beli kopi sama roti total 40rb, kopinya 25`), a model could propose the rows. This follows the project's rules, so it has more steps than the others:

1. **Eval set first** (`CLAUDE.md`: dataset and baseline before the agent). A labelled file of about 80 real phrases under `apps/api/evals/quick-add/` (the labelling guide in `apps/api/evals/labeling-guide.md` is the format reference), each with the expected rows (amount, category, place, date). The current parser scores on it first; that score is the baseline an LLM has to beat.
2. **A server route** `POST /quick-add/read` (not a client call, so the key stays on the server): takes the text (capped, about 1000 characters), returns proposed rows. It reuses the existing OpenRouter access (ADR-003), the per-user rate limit and the daily token budget (`app/ai/limits.py`).
3. **The model proposes, plain code checks.** The same rule as the receipt validator: every amount in a proposed row must appear in the text, at most 20 rows, categories from the fixed list, dates in range. A row that fails the check is dropped or flagged, never trusted.
4. **The text is untrusted.** It goes in as data inside the prompt; the route has no tools and cannot write. Output is rows, nothing else.
5. **When it runs:** only when the person asks. The sheet shows a small "Let Notarik read it" action when the rules were unsure (several amounts in one piece, a row with no amount), not on every keystroke. That keeps cost and latency off the normal path and keeps text from leaving the device unless the person chose it.
6. **The proposals fill the same list.** The person edits and saves with the same batch route, so there is nothing new to confirm.
7. **Decision record:** a short ADR (007) for the endpoint, the model choice and the cost, with the eval numbers.

Done when the LLM beats the baseline on the eval set by a margin worth its cost (for example fewer rows needing a manual fix), the safety checks have tests (an amount not in the text is rejected, an injected instruction in the text changes nothing), and it only runs on request.

This part can stay unbuilt: if the rules plus number words and voice are good enough on the eval set, skip it.

---

## Order and effort

| Step | What | Rough size |
|------|------|-----------|
| A | Home shortcut row | an hour |
| B0 | Reproduce the Edit budgets keyboard problem | minutes |
| B1 | Extract `BottomSheet` from Quick add, no behaviour change | half a day |
| B2 | Move Edit budgets onto it | an hour |
| C1 | Number words | half a day |
| C2 | Voice into the box | a day, mostly permissions and device checks |
| C3a | Eval set for Quick add | half a day of labelling |
| C3b | LLM route, checks, ADR | a day or two, only if C3a says it is worth it |

## Questions for the owner

1. **A:** should the four shortcut tints follow Figma exactly (they differ slightly from today)? Recommended: yes.
2. **B:** is a shared `BottomSheet` component the right level of change, or is a smaller fix for Edit budgets alone preferred? Recommended: the shared component, since the two sheets should behave the same.
3. **C2:** on-device recognition first (recommended), or a server speech-to-text route straight away?
4. **C3:** build the LLM read at all, or stop after number words and voice? Recommended: decide after the eval set shows how often the rules fail.
