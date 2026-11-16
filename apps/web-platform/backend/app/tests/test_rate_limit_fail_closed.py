from __future__ import annotations

import pytest

from app.cache import RateLimiter, RateLimitUnavailable


def test_production_rate_limiter_fails_closed_without_redis(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("REDIS_URL", raising=False)
    limiter = RateLimiter()
    assert limiter.backend == "memory"
    with pytest.raises(RateLimitUnavailable):
        limiter.allow("production-client")


def test_production_rate_limiter_fails_closed_when_redis_eval_fails(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")

    class BrokenRedis:
        def eval(self, *args, **kwargs):
            raise OSError("redis unavailable")

    limiter = RateLimiter()
    limiter._redis = BrokenRedis()
    with pytest.raises(RateLimitUnavailable):
        limiter.allow("production-client")


def test_development_rate_limiter_retains_memory_fallback(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("REDIS_URL", raising=False)
    limiter = RateLimiter()
    assert limiter.allow("development-client", limit=1, window_seconds=60)
    assert not limiter.allow("development-client", limit=1, window_seconds=60)
