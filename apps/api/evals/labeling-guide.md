# Receipt labelling

One JSON file per receipt. Images stay in `apps/api/evals/data/images/` and are gitignored.

```json
{
  "id": "r001",
  "split": "dev",
  "file": "r001.jpg",
  "merchant": "Indomaret",
  "date": "2026-10-17",
  "subtotal": 20000,
  "total": 22000,
  "category": "Groceries",
  "items": [{ "name": "Air mineral", "qty": 2, "line_total": 8000 }]
}
```

Rules:

- `total` is the final amount due, after tax and service charge. It may be higher than `subtotal`. It is never the subtotal.
- `items[].line_total` is the rightmost amount on that line. Do not multiply quantity by unit price.
- Amounts are integers in rupiah. A 100 rupiah gap between the item sum and the subtotal is rounding, not a mistake.
- If the total cannot be read, set it to `null`. Do not guess.
- `split` is `dev` or `test`. Do not use `test` receipts to change the prompt.
- About 30% of receipts are `test`.
