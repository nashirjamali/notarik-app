# Plan: playful onboarding animation

Status: **steps 1 to 7 built** (step 8, the optional extras, is not). Screen: `apps/mobile/app/(auth)/index.tsx`. Code is in `apps/mobile/src/features/onboarding/`.

Decisions taken (the recommendations below): mascot layers split from the existing export, React Native `Animated` (no new dependency), no haptics, generic icon pop only.

What was built and where it differs from this plan:

- **Mascot layers:** instead of a new Figma export, `onboarding-mark.svg` was split mechanically into `mascot-body.svg`, `mascot-eyes.svg` and `mascot-pupils.svg`. Path data is unchanged and the three keep the same 120 x 102.353 box so they stack exactly. The old combined file was removed.
- **Entrance, idle float and breathe, random blink, mascot hop with icons pushed outward, icon pop and wiggle, pupils and lean following a touch or the mouse:** all as described below.
- **Reduce motion** shows the final layout at once and disables loops, taps and tracking. The hero is hidden from screen readers.
- **Not verified on device:** the eye tracking while a finger is held down on the iPhone (the simulator tool cannot hold a touch); it is verified with the mouse on web.
- **Tests:** unit tests for the pure helpers (`motion.test.ts`) and two e2e tests (reduce motion, and taps on the mascot and icons).
- The Figma node originally noted here (540:418) is the Login screen, not onboarding.

## Goal

Make the first screen feel alive and a little funny without changing the approved layout. The Notarik mascot (the receipt-shaped logo with two eyes) and the four 3D icons (camera, coffee, groceries, receipt) react to time and to touch. The screen must stay fast, readable and accessible, and the two buttons must work from the first frame.

Non-goals: new copy, new layout, sound, video/Lottie assets, changes to signup or login, and any change to buttons (their look and press behaviour stay as they are).

## What exists today

- The hero is absolutely positioned inside a 390 x 380 box: soft circle, mascot (`onboarding-mark.svg`, 120 x 102), four icon PNGs, each with a fixed tilt.
- Nothing is animated. There is no animation library in `package.json`; `Animated` from react-native is already used in `snap.tsx` and `quick-add.tsx`.
- The mascot SVG is **one file**: body (two `Union` paths) and eyes (`Group 2`: two black ovals and two white pupils) are exported together, so the eyes cannot move on their own yet.

## Motion design

All numbers are a starting point, tuned on a real screen.

### 1. Entrance (about 1.2 s, once)

| Order | Element | Motion |
|-------|---------|--------|
| 1 | Soft circle | Scale 0.6 to 1 and fade in, 450 ms ease-out |
| 2 | Mascot | Drops from -60 px with a bounce; on landing squashes (scaleY 0.85, scaleX 1.1) then springs back. About 700 ms |
| 3 | 4 icons | Pop out from behind the mascot to their slots with a spring and a small overshoot, staggered 90 ms apart (camera, coffee, receipt, groceries) |
| 4 | Headline, body | Fade up 12 px, 350 ms, starts at about 600 ms |
| 5 | Buttons | Fade up 12 px, starts at about 800 ms. They are tappable from t = 0; only opacity and a small translate are animated |

### 2. Idle loop (while the screen is focused)

- Mascot floats up and down about 4 px over 3 s and breathes (scale 1 to 1.02), eased in and out.
- Each icon bobs about 5 px and sways about 3 degrees around its own tilt, each with a different period (2.4 to 3.6 s) and phase so they never move in sync.
- Mascot blinks every 3 to 6 s (random interval): eyes squash to scaleY 0.1 for 120 ms and open again. Needs the separate eyes layer (see decisions).

### 3. Touch

- **Tap the mascot:** it hops (jump 18 px, squash on landing), eyes go wide for a moment, and the four icons are nudged outward and spring back.
- **Tap an icon:** spring pop (scale 1.15 and back) with a wiggle. Optional second pass, one cheeky reaction per icon: camera flashes a white circle, coffee gets a steam wisp, receipt unrolls a little, groceries bounce. Ship the generic pop first.
- **Touch or move over the hero:** the pupils follow the finger (or the mouse on web), moving at most about 3 px inside each eye, and the mascot leans a few degrees toward the touch point. Eyes ease back to centre on release.
- **Buttons: no change.** The two onboarding buttons ("Get started" and "I already have an account") keep their current look and press behaviour. The mascot does not react to them and navigation is not delayed. A shared press animation for buttons is out of scope for now.

### 4. Optional extras (not in the first cut)

- Light haptic on mascot tap and icon tap (`expo-haptics`, new dependency).
- Five quick taps on the mascot: a full spin as an easter egg.

## Technical approach

- **Library:** keep React Native `Animated` with `useNativeDriver: true` for transform and opacity. No new dependency, works on iOS, Android and web (react-native-web), and covers everything above. Reanimated would only pay off for gesture-heavy work; revisit if the eye tracking feels laggy.
- **Structure** (new folder `apps/mobile/src/features/onboarding/`):
  - `motion.ts`: all durations, distances, spring configs and the per-icon phase table in one place.
  - `useEntrance.ts`, `useIdleLoop.ts`, `useEyeTracking.ts`: each returns `Animated.Value`s or interpolations.
  - `Mascot.tsx` (body, eyes, blink, hop) and `FloatingIcon.tsx` (slot, tilt, bob, pop).
  - `app/(auth)/index.tsx` stays the screen and composes these; layout numbers stay as they are.
- **Pure logic with unit tests:** clamp of the eye offset to the eye radius, random blink interval within 3 to 6 s, stagger delays. These run in jest without rendering.
- **Assets:** if eyes must move, export the eyes group from Figma as its own SVG with `download_assets` (never redraw or edit paths by hand), and a body-only SVG without the eyes. Keep the existing combined `onboarding-mark.svg` until the new pair is verified, then remove it if unused.

## Accessibility and performance

- **Reduce motion:** read `AccessibilityInfo.isReduceMotionEnabled()` (it also reflects `prefers-reduced-motion` on web). When on: show the final static layout, no loops, no tracking, tap reactions limited to a quick opacity change.
- **Screen readers:** the hero is decorative. Hide the images and mascot from the accessibility tree so only the headline, body and the two buttons are read.
- **Battery:** stop the idle loops and blink timer when the screen loses focus (`useFocusEffect`) or the app goes to the background (`AppState`); restart on return. Clean up timers on unmount.
- **Budget:** 60 fps on an iPhone 13 and a mid-range Android; at most about 12 animated values in total; no JS-thread work per frame except eye tracking, which only runs while a finger is down.

## Steps

| # | Step | Done when |
|---|------|-----------|
| 1 | `motion.ts` constants and pure helpers with jest tests | Tests pass for eye clamp, blink interval, stagger |
| 2 | Entrance animation | Plays once on a cold start; buttons tappable immediately; layout unchanged after it ends |
| 3 | Idle loops (float, breathe, bob) | Loops run smoothly, icons out of phase, stop on blur and background |
| 4 | Tap reactions (mascot hop, icon pop) | Each tap reacts and settles back; no stuck state when tapping rapidly || 5 | Eyes layer, blink and eye tracking | Pupils follow the finger on iPhone and the mouse on web; blink looks natural |
| 6 | Reduce motion and accessibility pass | With reduce motion on, the screen is static; screen reader reads only text and buttons |
| 7 | Verify on web and iPhone 13, run the whole e2e suite | Screenshots at rest match Figma; existing onboarding e2e tests unchanged and green; an e2e test with reduced motion emulated confirms the buttons work |
| 8 | Optional extras (icon-specific reactions, haptics, spin) | Only if the first cut feels good |

Step 5 depends on the Figma export; steps 1 to 4 and 6 do not, so the work can start there.
## Risks

- **Eyes inside one SVG:** until the layers are exported, only whole-mascot motion is possible (steps 2 to 4 still work).
- **Native driver on web:** transform and opacity are supported, but verify there is no warning or fallback jank on react-native-web.
- **e2e flakiness:** Playwright clicks must not race the entrance. Buttons stay fully interactive from the start, and the e2e tests can run with reduced motion emulated to be deterministic.
- **Overdoing it:** too much movement on the first screen reads as noise. Keep amplitudes small and cut anything that does not feel charming on a real device.

## Decisions needed

1. **Eyes layer:** OK to export the eyes and a body-only mascot from Figma so the mascot can blink and look around? (Recommended: yes.)
2. **Library:** stay on React Native `Animated`, or add Reanimated? (Recommended: stay on `Animated`.)
3. **Haptics:** add `expo-haptics` for tap feedback? (Recommended: later, as an extra.)
4. **Icon reactions:** generic pop only, or a unique reaction per icon? (Recommended: generic first, unique ones as step 8.)