# 14 — Capture and review screens

**Label:** FE · **Phase:** 2 · **Depends on:** 08, 13 · **Size:** ~10–14 h

## Goal
Take or choose a receipt, watch the agent's progress, review the draft with suspect fields highlighted, correct it and save.

## You will learn
- Camera and image picker APIs and permissions on native versus web
- Image resizing and compression before upload
- Consuming a streaming (SSE) endpoint in React Native and on web
- Designing a review UI that builds trust (show what was uncertain)

## Build
- [ ] Capture options: camera, gallery, PDF. Handle permission denied with a clear message and fallback.
- [ ] Resize/compress the image on the device before upload.
- [ ] Progress screen driven by the SSE events ("Reading receipt", "Checking totals", "Re-reading total"). Handle dropped connections by falling back to polling the run status.
- [ ] Review screen: editable merchant, date, category, items; highlight fields with validator issues or low confidence and show the reason.
- [ ] Items-versus-total mismatch is visible and fixable.
- [ ] Confirm → saved → show it in the list. Cancel discards the run.
- [ ] Failure states: unreadable receipt, upstream error, rate limit, offline. Offer manual entry as the fallback.

## Done when
- A real photo goes from capture to saved transaction on phone, and a PDF or image file works on web.
- Backgrounding the app mid-run and returning shows the right state.

## Tests
- Unit tests for the event-to-UI-state mapping (a pure reducer is easiest).
- Component tests for the review screen with a draft containing issues.
- End-to-end test on web with a mocked backend run.

## Pitfalls
- Uploading full-resolution photos over mobile data.
- SSE support differences between platforms; verify early.
- Hiding model uncertainty. Users should see what to double check.

## Read
- Expo Camera and Image Picker docs; EventSource options for React Native
