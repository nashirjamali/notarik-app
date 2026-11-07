# Merchant and expense flow

How an input (typed sentence or receipt photo) becomes expenses, merchants and items. Goal: one visit to one place is one expense, without the user arranging it.

## Rules

1. **One receipt is one expense.** A captured receipt becomes one expense named after the merchant printed on it. Its lines are the items. Two different receipts are two expenses, even from the same merchant.
2. **One input is one visit per place.** In Quick add, lines typed together that name the same merchant on the same day are saved as one expense: each line becomes an item, the total is the sum, and the category is the most common one among the lines (the first one wins a tie).
3. **Lines without a merchant stay on their own.** Nothing is guessed for them.
4. **Manual override.** The "Save as one expense" switch in Quick add puts every line into a single expense, whatever the merchants.

Merchant matching ignores letter case and surrounding spaces (`Starbucks` = `starbucks`). The date is part of the match, so the same place on two days stays two expenses.

## Quick add (web)

```
"kopi 20rb di starbucks, roti 15rb di Starbucks, bensin 50rb di shell, parkir 5rb"
        |
        v  splitEntries + parseMany            (apps/web/src/lib/quickAdd.ts)
   4 rows
        |
        v  groupRows                           (apps/web/src/lib/quickAddRows.ts)
   [Starbucks x2] [Shell] [no merchant]
        |
        v  expensesFromRows -> oneExpense / toInput
   3 expenses:  Starbucks Rp35.000 (2 items), Shell Rp50.000, Parkir Rp5.000
        |
        v  POST /transactions/batch            (all or nothing)
```

The "Notarik understood" card and the save button show the number of expenses after grouping. Lines from the same place are listed together with a note that they are combined.

## Receipt capture

```
photo -> POST /receipts -> extract (model) -> validate (plain code) -> review -> confirm -> expense + items
```

- The model returns `merchant`, `date`, `total_minor`, `subtotal_minor`, `discount_minor`, `category` and `items`. Reasoning is off and the call may take up to 60 s (it timed out at 30 s with reasoning on).
- `total_minor` is what was paid. `discount_minor` is the sum of discount lines printed on the receipt (Diskon, Promo, Voucher), always positive. A discount is never an item; a negative line the model lists as an item is moved into `discount_minor`.
- The validator accepts item sums that match the subtotal with or without the discount, and a total below the subtotal only when the gap is the discount.
- A remembered merchant sets the category (`merchant_memory`), so the same place keeps the same category.
- Receipt text is untrusted data, never instructions.

## Not done yet

- The mobile app (`apps/mobile/src/lib/quickAddRows.ts`) still saves one expense per line unless the switch is on.
- Chat (`POST /chat`) still reads one expense per message.
- No merging across separate inputs by design (rule 1); if that is wanted later it needs an explicit "add to this expense" action, not automatic matching.
