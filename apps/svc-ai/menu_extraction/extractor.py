"""
Menu Extraction Pipeline
@module svc-ai/menu_extraction/extractor
@description LangChain pipeline for extracting structured menu data from PDF/images
@phase P199 - Storefront Menu Extraction AI (LangChain)

Pipeline:
  1. Document ingestion (PDF/image via S3 or Cloudinary URL)
  2. OCR text extraction (AWS Textract)
  3. LangChain structured extraction (Claude via Bedrock)
  4. Validation and confidence scoring
  5. Sanity-compatible output formatting
"""

from __future__ import annotations

import logging
import time
from typing import Optional
from uuid import uuid4

from .models import (
    AllergenType,
    ExtractedMenuCategory,
    ExtractedMenuItem,
    MenuExtractionRequest,
    MenuExtractionResult,
)

logger = logging.getLogger(__name__)

# LangChain prompt template for menu extraction
MENU_EXTRACTION_PROMPT = """You are a menu extraction specialist for a South African food delivery platform.

Given the following OCR text extracted from a restaurant menu, extract ALL menu items into structured JSON format.

Rules:
1. Extract every menu item with name, description, price, and category
2. Prices are in South African Rand (ZAR) unless specified otherwise
3. Detect allergens from descriptions (gluten, dairy, nuts, eggs, soy, shellfish)
4. Mark items as vegetarian/vegan based on descriptions and ingredients
5. Group items into logical categories (Starters, Mains, Desserts, Drinks, etc.)
6. If a price is ambiguous, use the highest reasonable interpretation
7. Ignore non-menu content (restaurant info, hours, addresses)
8. For each item, provide a confidence score (0.0-1.0) based on extraction clarity

OCR Text:
{ocr_text}

Currency: {currency}
Language: {language}

Respond with valid JSON matching this schema:
{{
  "categories": [
    {{
      "name": "Category Name",
      "display_order": 0,
      "items": [
        {{
          "name": "Item Name",
          "description": "Item description",
          "price": 99.99,
          "category": "Category Name",
          "allergens": ["gluten", "dairy"],
          "is_vegetarian": false,
          "is_vegan": false,
          "preparation_time": null,
          "confidence_score": 0.95
        }}
      ]
    }}
  ]
}}
"""


class MenuExtractionError(Exception):
    """Custom exception for menu extraction failures"""

    def __init__(self, message: str, stage: str) -> None:
        self.stage = stage
        super().__init__(f"[{stage}] {message}")


async def extract_text_from_document(
    file_url: str,
    file_type: str,
) -> str:
    """
    Extract raw text from PDF or image using AWS Textract

    In production, this calls AWS Textract via boto3. For now, provides
    the integration point with proper error handling.

    Args:
        file_url: S3 or Cloudinary URL of the document
        file_type: MIME type of the document

    Returns:
        Extracted text content

    Raises:
        MenuExtractionError: If OCR fails
    """
    logger.info(
        "Starting OCR extraction",
        extra={"file_url": file_url, "file_type": file_type},
    )

    try:
        # TODO: Integrate with AWS Textract via boto3
        # textract_client = boto3.client('textract', region_name='af-south-1')
        #
        # if file_type == 'application/pdf':
        #     response = textract_client.start_document_text_detection(
        #         DocumentLocation={'S3Object': {'Bucket': bucket, 'Name': key}}
        #     )
        # else:
        #     response = textract_client.detect_document_text(
        #         Document={'S3Object': {'Bucket': bucket, 'Name': key}}
        #     )

        # Placeholder: return empty string until Textract integration
        logger.warning(
            "Textract integration pending - returning placeholder",
            extra={"file_url": file_url},
        )
        return ""

    except Exception as exc:
        raise MenuExtractionError(
            f"OCR extraction failed: {exc}",
            stage="textract",
        ) from exc


async def extract_menu_with_llm(
    ocr_text: str,
    currency: str,
    language: str,
) -> dict:
    """
    Use LangChain + Claude (via AWS Bedrock) to extract structured menu data

    Args:
        ocr_text: Raw text from OCR
        currency: Currency code (default ZAR)
        language: Language code (default en)

    Returns:
        Parsed menu structure as dict

    Raises:
        MenuExtractionError: If LLM extraction fails
    """
    logger.info(
        "Starting LLM menu extraction",
        extra={"text_length": len(ocr_text), "currency": currency},
    )

    try:
        # TODO: Full LangChain integration with AWS Bedrock
        # from langchain_aws import ChatBedrock
        # from langchain_core.prompts import ChatPromptTemplate
        # from langchain_core.output_parsers import JsonOutputParser
        #
        # llm = ChatBedrock(
        #     model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        #     region_name="af-south-1",
        #     model_kwargs={"temperature": 0.1, "max_tokens": 4096},
        # )
        #
        # prompt = ChatPromptTemplate.from_template(MENU_EXTRACTION_PROMPT)
        # parser = JsonOutputParser()
        # chain = prompt | llm | parser
        #
        # result = await chain.ainvoke({
        #     "ocr_text": ocr_text,
        #     "currency": currency,
        #     "language": language,
        # })
        # return result

        logger.warning(
            "LLM integration pending - returning empty result",
        )
        return {"categories": []}

    except Exception as exc:
        raise MenuExtractionError(
            f"LLM extraction failed: {exc}",
            stage="llm",
        ) from exc


def validate_extracted_items(
    raw_categories: list[dict],
) -> tuple[list[ExtractedMenuCategory], list[str]]:
    """
    Validate and clean extracted menu items

    Performs:
    - Price sanity checks (R1-R10,000 range for ZAR)
    - Name length validation
    - Duplicate detection
    - Low confidence flagging

    Args:
        raw_categories: Raw category dicts from LLM extraction

    Returns:
        Tuple of (validated categories, warning messages)
    """
    warnings: list[str] = []
    validated_categories: list[ExtractedMenuCategory] = []
    seen_names: set[str] = set()

    for cat_idx, raw_cat in enumerate(raw_categories):
        cat_name = str(raw_cat.get("name", f"Category {cat_idx + 1}"))
        validated_items: list[ExtractedMenuItem] = []

        for raw_item in raw_cat.get("items", []):
            try:
                item_name = str(raw_item.get("name", "")).strip()

                # Skip empty names
                if not item_name:
                    warnings.append(f"Skipped item with empty name in {cat_name}")
                    continue

                # Check for duplicates
                name_lower = item_name.lower()
                if name_lower in seen_names:
                    warnings.append(f"Duplicate item skipped: {item_name}")
                    continue
                seen_names.add(name_lower)

                # Validate price
                price = float(raw_item.get("price", 0))
                if price <= 0:
                    warnings.append(f"Invalid price for {item_name}, skipping")
                    continue
                if price > 10_000:
                    warnings.append(
                        f"Suspiciously high price for {item_name}: R{price}"
                    )

                # Parse allergens
                raw_allergens = raw_item.get("allergens", [])
                allergens: list[AllergenType] = []
                for allergen_str in raw_allergens:
                    try:
                        allergens.append(AllergenType(allergen_str))
                    except ValueError:
                        pass  # Skip unknown allergens

                # Build validated item
                confidence = float(raw_item.get("confidence_score", 0.5))
                if confidence < 0.5:
                    warnings.append(
                        f"Low confidence ({confidence:.2f}) for: {item_name}"
                    )

                validated_items.append(
                    ExtractedMenuItem(
                        name=item_name[:80],
                        description=(
                            str(raw_item.get("description", ""))[:300] or None
                        ),
                        price=round(price, 2),
                        category=cat_name,
                        allergens=allergens,
                        is_vegetarian=bool(raw_item.get("is_vegetarian", False)),
                        is_vegan=bool(raw_item.get("is_vegan", False)),
                        preparation_time=raw_item.get("preparation_time"),
                        confidence_score=min(max(confidence, 0.0), 1.0),
                    )
                )

            except (TypeError, ValueError) as exc:
                warnings.append(
                    f"Failed to parse item in {cat_name}: {exc}"
                )

        if validated_items:
            validated_categories.append(
                ExtractedMenuCategory(
                    name=cat_name[:50],
                    display_order=cat_idx,
                    items=validated_items,
                )
            )

    return validated_categories, warnings


async def extract_menu(
    request: MenuExtractionRequest,
) -> MenuExtractionResult:
    """
    Main menu extraction pipeline

    Orchestrates the full extraction flow:
    1. Download and OCR the document
    2. Extract structured data via LLM
    3. Validate and clean results
    4. Return structured MenuExtractionResult

    Args:
        request: Menu extraction request with file URL and metadata

    Returns:
        MenuExtractionResult with extracted categories and items
    """
    start_time = time.monotonic()
    job_id = str(uuid4())

    logger.info(
        "Menu extraction started",
        extra={
            "job_id": job_id,
            "partner_id": request.partner_id,
            "file_type": request.file_type,
        },
    )

    try:
        # Step 1: OCR extraction
        ocr_text = await extract_text_from_document(
            file_url=request.file_url,
            file_type=request.file_type,
        )

        if not ocr_text.strip():
            logger.warning(
                "OCR returned empty text",
                extra={"job_id": job_id},
            )
            return MenuExtractionResult(
                partner_id=request.partner_id,
                categories=[],
                total_items=0,
                average_confidence=0.0,
                warnings=["No text could be extracted from the document"],
                raw_text="",
                processing_time_ms=_elapsed_ms(start_time),
            )

        # Step 2: LLM extraction
        raw_result = await extract_menu_with_llm(
            ocr_text=ocr_text,
            currency=request.currency,
            language=request.language,
        )

        # Step 3: Validation
        raw_categories = raw_result.get("categories", [])
        validated_categories, warnings = validate_extracted_items(raw_categories)

        # Calculate stats
        all_items = [
            item for cat in validated_categories for item in cat.items
        ]
        total_items = len(all_items)
        avg_confidence = (
            sum(item.confidence_score for item in all_items) / total_items
            if total_items > 0
            else 0.0
        )

        processing_time = _elapsed_ms(start_time)

        logger.info(
            "Menu extraction completed",
            extra={
                "job_id": job_id,
                "total_items": total_items,
                "categories": len(validated_categories),
                "avg_confidence": f"{avg_confidence:.2f}",
                "processing_time_ms": processing_time,
            },
        )

        return MenuExtractionResult(
            partner_id=request.partner_id,
            categories=validated_categories,
            total_items=total_items,
            average_confidence=round(avg_confidence, 3),
            warnings=warnings,
            raw_text=ocr_text[:5000] if ocr_text else None,
            processing_time_ms=processing_time,
        )

    except MenuExtractionError:
        raise
    except Exception as exc:
        logger.error(
            "Unexpected menu extraction error",
            extra={"job_id": job_id, "error": str(exc)},
        )
        raise MenuExtractionError(
            f"Unexpected error: {exc}",
            stage="pipeline",
        ) from exc


def _elapsed_ms(start_time: float) -> int:
    """Calculate elapsed time in milliseconds"""
    return int((time.monotonic() - start_time) * 1000)
