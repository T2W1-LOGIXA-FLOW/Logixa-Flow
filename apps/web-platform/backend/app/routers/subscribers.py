from __future__ import annotations

import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..cache import RateLimitUnavailable, rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)

_SUBSCRIBE_RATE_LIMIT_MAX = int(os.getenv("SUBSCRIBE_RATE_LIMIT_MAX", "2"))
_SUBSCRIBE_RATE_LIMIT_WINDOW = int(os.getenv("SUBSCRIBE_RATE_LIMIT_WINDOW", "3600"))


@router.post("/subscribers", response_model=schemas.SubscriberOut, status_code=status.HTTP_201_CREATED)
def subscribe(subscriber: schemas.SubscriberCreate, request: Request, db: Session = Depends(get_db)) -> models.Subscriber:
    # Per-email rate limiting: prevent flooding / enumeration
    email_key = f"subscribe_rate:{(subscriber.email or '').strip().lower()}"
    try:
        allowed = rate_limiter.allow(
            email_key,
            limit=_SUBSCRIBE_RATE_LIMIT_MAX,
            window_seconds=_SUBSCRIBE_RATE_LIMIT_WINDOW,
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many subscription requests from this address. Please try again later.",
            )
    except RateLimitUnavailable:
        logger.warning("Rate-limit store unavailable for subscriber endpoint; allowing request")

    existing = db.query(models.Subscriber).filter(models.Subscriber.email == subscriber.email).first()
    if existing:
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing
    db_subscriber = models.Subscriber(email=subscriber.email)
    db.add(db_subscriber)
    db.commit()
    db.refresh(db_subscriber)
    return db_subscriber
