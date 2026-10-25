import re


def parse_amount(text: str) -> int | None:
    raw = text.strip().lower().replace(" ", "")
    if not raw or raw.startswith("-"):
        return None
    multiplier = 1
    body = raw
    for suffix, factor in (
        ("juta", 1_000_000),
        ("jt", 1_000_000),
        ("ribu", 1_000),
        ("rb", 1_000),
    ):
        if body.endswith(suffix):
            multiplier = factor
            body = body[: -len(suffix)]
            break
    if body.endswith("k") and multiplier == 1:
        multiplier = 1_000
        body = body[:-1]
    number = _parse_decimal(body, multiplier != 1)
    if number is None:
        return None
    value = number * multiplier
    if value < 0:
        return None
    rounded = int(round(value))
    if multiplier == 1 and number != rounded:
        return None
    return rounded


def _parse_decimal(raw: str, allow_fraction: bool) -> float | None:
    if not raw:
        return None
    body = raw
    if "," in body and "." in body:
        body = body.replace(".", "").replace(",", ".")
    elif "," in body:
        body = body.replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(\.\d{3})+", body):
        body = body.replace(".", "")
    if not re.fullmatch(r"\d+(\.\d+)?", body):
        return None
    if not allow_fraction and "." in body:
        return None
    return float(body)


def amount_in_text(text: str) -> int | None:
    match = re.search(
        r"(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*)(juta|jt|ribu|rb|k)?",
        text.lower(),
    )
    if not match:
        return None
    number = match.group(1).replace(" ", "")
    suffix = match.group(2) or ""
    return parse_amount(f"{number}{suffix}")
