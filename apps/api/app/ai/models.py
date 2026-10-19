import json
from time import perf_counter

import httpx

from app.ai.drafts import ExtractionFailure
from app.core.config import Settings

_model = None


class ScriptedModel:
    def __init__(self, outputs: list[dict]) -> None:
        self.outputs = list(outputs)
        self.last_usage = {"model": "scripted", "latency_ms": 1, "cost_usd": 0, "tokens": 1}

    def complete_json(self, system: str, user: str, image: bytes, content_type: str) -> dict:
        if not self.outputs:
            raise ExtractionFailure("schema_invalid", "Scripted model has no output")
        payload = self.outputs.pop(0)
        if isinstance(payload, Exception):
            raise payload
        return payload


class OpenRouterModel:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.last_usage: dict = {}

    def complete_json(self, system: str, user: str, image: bytes, content_type: str) -> dict:
        if not self.settings.openrouter_api_key:
            raise ExtractionFailure("not_configured", "OPENROUTER_API_KEY is not set")
        import base64

        encoded = base64.b64encode(image).decode()
        started = perf_counter()
        response = httpx.post(
            f"{self.settings.openrouter_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.settings.openrouter_api_key}"},
            json={
                "model": self.settings.openrouter_model,
                "messages": [
                    {"role": "system", "content": system},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{content_type};base64,{encoded}"},
                            },
                        ],
                    },
                ],
                "response_format": {"type": "json_object"},
            },
            timeout=30,
        )
        elapsed = int((perf_counter() - started) * 1000)
        if response.status_code == 429:
            raise ExtractionFailure("rate_limited", "The model provider rate limited the request")
        if response.status_code >= 400:
            raise ExtractionFailure("model_error", response.text[:300])
        body = response.json()
        usage = body.get("usage") or {}
        tokens = int(usage.get("total_tokens") or 0)
        self.last_usage = {
            "model": self.settings.openrouter_model,
            "latency_ms": elapsed,
            "tokens": tokens,
            "cost_usd": tokens * 0.0000005,
        }
        content = body["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise ExtractionFailure("schema_invalid", "Model output was not JSON") from exc


def get_model():
    if _model is not None:
        return _model
    return OpenRouterModel(Settings())


def set_model(model) -> None:
    global _model
    _model = model
