# 21 — Chat UI and confirm cards

**Label:** FE · **Phase:** 4 · **Depends on:** 14, 20 · **Size:** ~10–14 h

## Goal
A chat screen that streams answers, shows what the agent did, and presents every proposed write as a confirm card the user approves, edits or rejects.

## You will learn
- Streaming UI state: partial messages, tool-call progress, errors
- Keyboard-aware, inverted lists in React Native
- Designing safe interfaces for agent actions
- Rendering structured agent output (cards) instead of plain text

## Build
- [ ] Chat screen: message list, composer, attach photo, streaming assistant message, scroll behavior, keyboard handling on native and web.
- [ ] Show tool activity in a light way ("Checking dining spend for August…") and let the user expand details.
- [ ] Confirm card component for each `PendingAction` kind (create expense, set budget, edit, delete) showing exactly what will change, with Approve, Edit and Reject. Writes must be impossible without a tap.
- [ ] After approval, show the result and a link to the transaction.
- [ ] Suggested prompts for empty state; errors, rate-limit and offline states.
- [ ] Resume a conversation after restarting the app.

## Done when
- You can ask a question, log an expense by text, approve it, and see it in the list.
- Rejecting a card changes nothing in the data.

## Tests
- Unit tests for the stream-event reducer (tokens, tool events, final action, error).
- Component tests for each confirm card, especially that Approve calls the endpoint exactly once.
- End-to-end test on web with a mocked chat backend.

## Pitfalls
- Double-tap approving twice. Make the action idempotent on the server and disable after tap.
- Cards that summarize ambiguously. The card must show the exact values that will be written.
- Treating model text as trusted. Render it as text, never as HTML or executable markup.

## Read
- React Native `FlatList` inverted mode; keyboard avoiding views; OWASP guidance on LLM application risks
