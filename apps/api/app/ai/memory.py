import hashlib
import math
import re

DIMENSIONS = 64


def normalize_merchant(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", value.casefold()).split())


def embed_text(value: str) -> list[float]:
    vector = [0.0] * DIMENSIONS
    tokens = normalize_merchant(value).split() or [""]
    for token in tokens:
        digest = hashlib.sha256(token.encode()).digest()
        vector[digest[0] % DIMENSIONS] += 1 if digest[1] % 2 == 0 else -1
    norm = math.sqrt(sum(item * item for item in vector)) or 1
    return [item / norm for item in vector]


def cosine(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def memory_text(merchant: str, item_names: list[str], category: str) -> str:
    items = " ".join(name for name in item_names if name)
    return " | ".join(part for part in (merchant, items, category) if part)


def rank_memory(rows: list[dict], query: str, k: int = 5) -> list[dict]:
    merchant = normalize_merchant(query)
    exact = [row for row in rows if row.get("merchant_normalized") == merchant and merchant]
    if exact:
        return exact[:k]
    query_tokens = set(merchant.split())
    scored = []
    query_vector = embed_text(query)
    for row in rows:
        row_merchant = row.get("merchant_normalized") or ""
        row_tokens = set(row_merchant.split())
        overlap = len(query_tokens & row_tokens) / len(query_tokens | row_tokens) if query_tokens and row_tokens else 0
        vector = row.get("embedding") or []
        similarity = cosine(query_vector, vector) if len(vector) == DIMENSIONS else 0
        score = overlap if overlap >= 0.5 else similarity
        scored.append((score, row))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [row for score, row in scored if score > 0][:k]
