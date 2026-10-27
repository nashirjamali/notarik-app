# Plan: Quick add with many expenses in one go

Status: **decisions taken (below); steps 1 to 5 built (`parseMany`, `POST /transactions/batch`, the rows list in the Quick add sheet with per-row category, remove, flagged rows and the "Save as one expense" switch); step 6 is done except a last read of the docs, step 7 is not started.** Today Quick add (`apps/mobile/app/(app)/quick-add.tsx`) turns one sentence into one expense with `parseQuickAdd` in `apps/mobile/src/lib/quickAdd.ts`. This plan lets someone type several expenses in one box, see them as a list, and save them all at once.

## Decisions taken (2026-10-27)

1. **A by default** (separate expenses) with a "Save as one expense" switch when there are two or more rows (meaning B).
2. A trailing `di warteg` applies **only to its own row**, never to the others.
3. At most **20 rows** per save (`MAX_ROWS`).
4. A row without an amount is **flagged and blocks Save**.
5. The **chat is not changed** for now.

Built in step 1: `splitEntries(text)` (all pieces, not capped) and `parseMany(text, today)` (rows, capped at 20). Two small additions to the splitting rules below: a number written with dots (`25.000`) counts as a sure amount like `25rb`, and a piece that is only a name followed by a piece that is only an amount (`Indomaret, 187rb`) is joined back into one row.

## Goal

Type, for example:

```
kopi 25rb, nasi goreng 30rb di warteg, parkir 5rb
```

and get three expenses ready to save, each with its own amount, category and date, without opening the sheet three times. One tap saves all of them or none of them.

Non-goals for the first cut: voice input, an LLM, importing from a bank statement, recurring expenses.

## What exists today

- **Parser:** `parseQuickAdd(text)` is deterministic client-side code (no LLM). It picks one amount (the one with `rb`/`k`/`jt`, else the biggest), one merchant after `di`/`at`/`@`, a date word (`kemarin`, `hari ini`), and a category from keywords. It has jest tests (`quickAdd.test.ts`).
- **API:** `POST /transactions` takes one `TransactionCreate` (`merchant`, `date`, `total_minor`, `category`, `note`, `items[]`). `user_id` comes from the token and RLS applies (`user_connection`).
- **Data model:** a transaction can already hold `items` (`name`, `qty`, `line_total_minor`), so "one purchase with many lines" exists. "Many separate expenses" does not need new tables.
- **Sheet:** the "Notarik understood" card shows one parse; the category chips and Save act on that one parse.

## Decision needed first: what "many" means

| Meaning | Example | Result |
|---------|---------|--------|
| **A. Separate expenses (recommended default)** | `kopi 25rb, parkir 5rb` | Two rows in the transaction list, each with its own category |
| B. One expense with many items | `nasi 20rb, teh 5rb, kerupuk 2rb di warteg` | One transaction (total 27.000) with three item lines |

Most people log separate things. A grocery run or a meal is better as B. Proposal: **A by default, with a switch "Save as one expense" shown when there are two or more rows.** B reuses the existing `items` field, so it costs a little UI and no API change.

## How the text is split

Order of rules, simplest first so the result stays predictable:

1. **Explicit separators:** a new line, `;`, `,` (but not inside a number such as `1,5jt` or `25,000`) and ` + `. Each piece is parsed with the existing `parseQuickAdd`.
2. **Several amounts in one piece with no separator:** `kopi 25rb nasi goreng 30rb`. Cut after each amount that has its suffix (`rb`, `k`, `jt`) and keep the leading words with it. This is the risky rule, because a merchant can come after the amount (`makan siang 35rb di warteg`). So the cut is only made when the text after the amount does not start with `di`/`at`/`@` (that belongs to the same expense). Anything unclear stays in one piece, and the person can fix it in the list.
3. **Shared words:** a date word at the start (`kemarin kopi 25rb, parkir 5rb`) applies to every row; a date word inside one piece applies to that piece only. A merchant in the last piece only (`nasi 20rb, teh 5rb di warteg`) is **not** copied to the others unless the person turns on "Same place for all" (open question below).
4. **Rows without an amount** are kept and flagged ("Add an amount") instead of dropped, so nothing the person typed disappears silently. Save is disabled until each flagged row gets an amount or is removed.

The parser change is a new pure function `parseMany(text, today): QuickParse[]` next to `parseQuickAdd`, which stays as it is. One piece in means one row out, so today's behaviour does not change for a single expense.

## Screen

- While typing, the preview under the input becomes a list. One row shows the same thing as today's card: icon tile or category dot, title, small subtitle (category, date) and the amount on the right.
- A header says what was understood: "Notarik understood 3 expenses", with the total ("Rp 60.000").
- Each row can be tapped to change its category (reuse `OptionSheet`), edited by amount, or removed (an `x`).
- With one row the sheet looks and works exactly as now (category chips included). With two or more, the global category chips are replaced by the per-row category.
- The Save button says what it will do: "Save 3 expenses". It is disabled while a row is flagged.
- The sheet already grows with its content and scrolls past its maximum height, so a long list needs no new layout work.
- After saving: one expense goes to its details (as today); several go to the Transactions tab with the new rows visible.

No Figma design exists for the list; the row reuses the preview card's pieces, so it is proposed as a small addition to the current design and should be checked with the owner before building.

## API

New `POST /transactions/batch`:

- Body `{ "transactions": [TransactionCreate, ...] }`, 1 to 20 rows, each validated like `POST /transactions`.
- **All or nothing:** all rows are inserted in one database transaction, so a failure on row 3 saves nothing. The error names the row (`details[].field` such as `transactions.2.total_minor`), which the app maps back to the list.
- Returns the created rows in order.
- Same rules as the single route: `user_id` from the token only, RLS through `user_connection`, `source` is `manual`, money stays integer IDR. A cap on rows and on the sum keeps one request from becoming a bulk-insert tool.
- Why not call `POST /transactions` N times: no atomicity (a network drop leaves 2 of 3 saved with no clear way to retry), more round trips, and a clumsy error story.
- Regenerate `openapi.json` and `schema.ts`, and document it in `docs/api-for-frontend.md`.

## Not in the first cut: an LLM for messy text

The parser handles tidy lists. Messy input (`tadi beli kopi sama roti total 40rb, kopinya 25`) is where an LLM would help, and the Notarik chat already does "log an expense by talking". The rule in `CLAUDE.md` applies: a model never writes directly. Any future model-assisted split would produce the same list of **proposed** rows that the person confirms with Save, and its output counts as untrusted text. Decide after the deterministic version is used for a while; a labelled set of real phrases (below) gives the numbers to decide with.

## Tests

- **Parser (jest):** a table of about 40 phrases in Indonesian and English with the expected rows: separators, `1,5jt` not split, `2 nasi goreng 30rb` quantity, `makan siang 35rb di warteg` not cut, date at the start vs inside a piece, a piece without an amount, extra spaces and line breaks, empty input, a hundred pieces (capped).
- **API (pytest, real Postgres):** all rows saved in order; one bad row saves none and names its index; more than 20 rows rejected; another user's token never sees the rows (RLS); `user_id` in the body is ignored.
- **Mobile (jest):** the row list state (change category, remove, flagged row disables Save), Save label text, mapping a server error index to a row.
- **e2e (web):** type `kopi 25rb, nasi goreng 30rb`, see two rows, change one category, Save, and see both in Transactions; one row stays as today.

## Steps

| # | Step | Done when |
|---|------|-----------|
| 0 | Decide A/B and the open questions below | Written in this file |
| 1 | `parseMany` and its table of phrases (**done**) | All phrases pass; `parseQuickAdd` tests untouched and green |
| 2 | API `POST /transactions/batch` with tests, OpenAPI and `schema.ts` (**done**) | `make test` green, atomic failure proven |
| 3 | Sheet: list preview, per-row category, remove, flagged rows, Save label (**done**) | One row works as before; several rows work in the simulator |
| 4 | Save wiring and navigation after saving (**done**) | Several rows land in Transactions |
| 5 | "Save as one expense" switch (meaning B) (**done**) | Total and items correct in Details |
| 6 | e2e (**three tests added**), docs (`api-for-frontend.md`, **done**), update this plan | Whole suite green |
| 7 | Later: voice into the same box, an LLM for messy text as proposals | Only if the parser is not enough |

## Risks

- **Wrong splits** are the main risk (`di warteg` after an amount, a quantity before the price). The answer is the visible, editable list and a conservative rule: when unsure, keep one piece.
- **Duplicates:** typing the same line twice, or saving twice after a slow response, creates duplicate rows. The Save button locks while the request runs; a later step could warn about the same merchant, amount and day.
- **Date and time zone:** "kemarin" and "hari ini" use the device date, as the single parser already does.
- **Large input:** capped at 20 rows and a maximum text length, on both the app and the API.
- **Design drift:** the row list and the switch are not in Figma yet.

## Questions for the owner

1. **A or B?** Separate expenses by default with a "Save as one expense" switch (recommended), or only one of them.
2. **Same place for all:** should a trailing `di warteg` apply to every row, or only to the last one (recommended, safer)?
3. **Limit:** is 20 rows per save right?
4. **Rows without an amount:** flag them and block Save (recommended), or skip them silently?
5. Should the **Notarik chat** use the same batch route for "kopi 25rb dan parkir 5rb", as a proposal the person confirms?
