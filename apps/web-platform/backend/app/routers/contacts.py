from __future__ import annotations

import logging
import os
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..cache import RateLimitUnavailable, rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)

# Per-email rate limit: max 3 submissions per hour to prevent spam
_CONTACT_RATE_LIMIT_MAX = int(os.getenv("CONTACT_RATE_LIMIT_MAX", "3"))
_CONTACT_RATE_LIMIT_WINDOW = int(os.getenv("CONTACT_RATE_LIMIT_WINDOW", "3600"))


@router.post("/contacts", response_model=schemas.ContactOut, status_code=status.HTTP_201_CREATED)
def submit_contact(contact: schemas.ContactCreate, request: Request, db: Session = Depends(get_db)) -> models.Contact:
    # Per-email rate limiting: prevent flooding from a single address
    email_key = f"contact_rate:{(contact.email or '').strip().lower()}"
    try:
        allowed = rate_limiter.allow(
            email_key,
            limit=_CONTACT_RATE_LIMIT_MAX,
            window_seconds=_CONTACT_RATE_LIMIT_WINDOW,
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many contact submissions from this address. Please try again later.",
            )
    except RateLimitUnavailable:
        logger.warning("Rate-limit store unavailable for contact submission; allowing request")

    db_contact = models.Contact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact
