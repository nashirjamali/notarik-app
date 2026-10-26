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


_AMOUNT = re.compile(
    r"(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(juta|jt|ribu|rb|k)(?![a-z]))?",
    re.IGNORECASE,
)
# A bare number below this is a quantity ("2 packs of tea"), not an amount of rupiah.
MIN_PLAIN_AMOUNT = 1_000


def find_amount(text: str) -> tuple[int, int, int] | None:
    """The amount a person means in a sentence, with where it sits: (rupiah, start, end)."""
    found: list[tuple[int, int, int, bool]] = []
    for match in _AMOUNT.finditer(text):
        suffix = match.group(2) or ""
        value = parse_amount(f"{match.group(1).replace(' ', '')}{suffix}")
        if value is None or value <= 0:
            continue
        found.append((value, match.start(), match.end(), bool(suffix)))
    # "2 nasi goreng 30rb": the number with rb/k/jt wins, otherwise the largest real amount.
    suffixed = [item for item in found if item[3]]
    plain = [item for item in found if item[0] >= MIN_PLAIN_AMOUNT]
    chosen = suffixed[0] if suffixed else max(plain, key=lambda item: item[0], default=None)
    if chosen is None:
        return None
    return chosen[0], chosen[1], chosen[2]


def amount_in_text(text: str) -> int | None:
    found = find_amount(text)
    return found[0] if found else None


def format_idr(minor: int) -> str:
    digits = f"{abs(int(minor)):,}".replace(",", ".")
    return f"{'-' if minor < 0 else ''}Rp {digits}"
