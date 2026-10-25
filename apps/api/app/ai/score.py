import unicodedata


def score_receipt(label: dict, prediction: dict | None) -> dict:
    if prediction is None:
        return {
            "parsed": False,
            "total_exact": False,
            "date_exact": False,
            "category_exact": False,
            "item_precision": 0.0,
            "item_recall": 0.0,
        }
    expected_items = label.get("items") or []
    predicted_items = prediction.get("items") or []
    matched = _match_items(expected_items, predicted_items)
    precision = matched / len(predicted_items) if predicted_items else (1.0 if not expected_items else 0.0)
    recall = matched / len(expected_items) if expected_items else 1.0
    return {
        "parsed": True,
        "total_exact": _same_money(label.get("total"), prediction.get("total_minor", prediction.get("total"))),
        "date_exact": _text(label.get("date")) == _text(prediction.get("date")),
        "category_exact": _text(label.get("category")) == _text(prediction.get("category")),
        "item_precision": precision,
        "item_recall": recall,
    }


def aggregate(rows: list[dict]) -> dict:
    count = len(rows) or 1
    parsed = [row for row in rows if row["parsed"]]

    def rate(key: str) -> float:
        return sum(1 for row in rows if row[key]) / count

    def mean(key: str) -> float:
        return sum(row[key] for row in parsed) / (len(parsed) or 1)

    return {
        "receipts": len(rows),
        "parse_failures": len(rows) - len(parsed),
        "total_exact_match": rate("total_exact"),
        "date_match": rate("date_exact"),
        "category_accuracy": rate("category_exact"),
        "item_precision": mean("item_precision"),
        "item_recall": mean("item_recall"),
    }


def _match_items(expected: list[dict], predicted: list[dict]) -> int:
    pool = list(predicted)
    matched = 0
    for item in expected:
        name = _name(item.get("name"))
        total = item.get("line_total", item.get("line_total_minor"))
        for index, candidate in enumerate(pool):
            if _name(candidate.get("name")) == name and _same_money(
                total, candidate.get("line_total", candidate.get("line_total_minor"))
            ):
                matched += 1
                pool.pop(index)
                break
    return matched


def _name(value) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return " ".join(text.split())


def _text(value) -> str:
    return "" if value is None else str(value)


def _same_money(left, right) -> bool:
    if left is None or right is None:
        return left is None and right is None
    return int(left) == int(right)
