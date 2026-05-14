"""
Menu Extraction API Router
@module svc-ai/menu_extraction/router
@description FastAPI router for menu extraction endpoints
@phase P199 - Storefront Menu Extraction AI (LangChain)

Endpoints:
  POST /ai/menu/extract          - Synchronous menu extraction
  POST /ai/menu/extract/async    - Asynchronous extraction (returns job ID)
  GET  /ai/menu/extract/{job_id} - Check async extraction status
"""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status

from .extractor import MenuExtractionError, extract_menu
from .models import (
    MenuExtractionRequest,
    MenuExtractionResult,
    MenuExtractionStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/menu", tags=["menu-extraction"])

# In-memory job store (replace with Redis/Upstash in production)
_extraction_jobs: dict[str, MenuExtractionStatus] = {}


async def verify_partner_token(
    authorization: Annotated[str, Header()],
) -> str:
    """
    Verify JWT bearer token and extract partner_id

    In production, validates against Auth0/Cognito and checks
    that the caller has partner role permissions.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    # TODO: Integrate with Auth0 JWT validation
    # token = authorization.removeprefix("Bearer ")
    # decoded = await verify_jwt(token)
    # return decoded["sub"]

    return "verified-partner"


@router.post(
    "/extract",
    response_model=MenuExtractionResult,
    status_code=status.HTTP_200_OK,
    summary="Extract menu from PDF/image",
    description=(
        "Synchronously extracts structured menu data from an uploaded "
        "PDF or image file using OCR + LangChain AI extraction."
    ),
)
async def extract_menu_endpoint(
    request: MenuExtractionRequest,
    _partner: str = Depends(verify_partner_token),
) -> MenuExtractionResult:
    """
    Synchronous menu extraction endpoint

    Accepts a file URL (S3/Cloudinary), runs OCR + LLM extraction,
    and returns structured menu data compatible with Sanity CMS schema.

    Rate limit: 10 requests per partner per hour
    Max file size: 20MB
    Supported formats: PDF, JPEG, PNG, WebP
    """
    logger.info(
        "Menu extraction request received",
        extra={
            "partner_id": request.partner_id,
            "file_type": request.file_type,
        },
    )

    try:
        result = await extract_menu(request)

        if result.total_items == 0:
            logger.warning(
                "Menu extraction returned zero items",
                extra={"partner_id": request.partner_id},
            )

        return result

    except MenuExtractionError as exc:
        logger.error(
            "Menu extraction failed",
            extra={
                "partner_id": request.partner_id,
                "stage": exc.stage,
                "error": str(exc),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Menu extraction failed at {exc.stage} stage: {exc}",
        ) from exc


@router.post(
    "/extract/async",
    response_model=MenuExtractionStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start async menu extraction",
    description="Starts an asynchronous menu extraction job and returns a job ID for polling.",
)
async def extract_menu_async_endpoint(
    request: MenuExtractionRequest,
    _partner: str = Depends(verify_partner_token),
) -> MenuExtractionStatus:
    """
    Asynchronous menu extraction endpoint

    Creates a background extraction job and returns immediately with a job ID.
    Use GET /ai/menu/extract/{job_id} to poll for results.
    """
    job_id = str(uuid4())

    job_status = MenuExtractionStatus(
        job_id=job_id,
        partner_id=request.partner_id,
        status="pending",
        progress=0.0,
    )

    _extraction_jobs[job_id] = job_status

    # TODO: Dispatch to BullMQ/Celery background worker
    # In production, this would push to a task queue:
    # await celery_app.send_task('extract_menu', args=[request.dict(), job_id])

    logger.info(
        "Async extraction job created",
        extra={"job_id": job_id, "partner_id": request.partner_id},
    )

    return job_status


@router.get(
    "/extract/{job_id}",
    response_model=MenuExtractionStatus,
    summary="Check extraction job status",
    description="Returns the current status of an async menu extraction job.",
)
async def get_extraction_status(
    job_id: str,
    _partner: str = Depends(verify_partner_token),
) -> MenuExtractionStatus:
    """
    Get status of an async extraction job

    Returns current status, progress percentage, and result when complete.
    """
    job_status = _extraction_jobs.get(job_id)

    if not job_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extraction job {job_id} not found",
        )

    return job_status
