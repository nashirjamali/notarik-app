from time import monotonic
from uuid import UUID

_windows: dict[str, list[float]] = {}


class LimitError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def reset_limits() -> None:
    _windows.clear()


def hit_rate_limit(user_id: UUID, limit: int, now: float | None = None) -> None:
    stamp = monotonic() if now is None else now
    key = str(user_id)
    window = [item for item in _windows.get(key, []) if stamp - item < 60]
    if len(window) >= limit:
        raise LimitError("rate_limited", "Too many chat requests. Wait a minute and try again.")
    window.append(stamp)
    _windows[key] = window
