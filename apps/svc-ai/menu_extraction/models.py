"""
Menu Extraction Data Models
@module svc-ai/menu_extraction/models
@description Pydantic models for menu extraction input/output
@phase P199 - Storefront Menu Extraction AI (LangChain)
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AllergenType(str, Enum):
    """Supported allergen classifications"""

    GLUTEN = "gluten"
    DAIRY = "dairy"
    NUTS = "nuts"
    EGGS = "eggs"
    SOY = "soy"
    SHELLFISH = "shellfish"
    HALAL = "halal"
    KOSHER = "kosher"


class MenuExtractionRequest(BaseModel):
    """Request payload for menu extraction"""

    partner_id: str = Field(
        ...,
        description="UUID of the partner restaurant",
        min_length=1,
        max_length=36,
    )
    file_url: str = Field(
        ...,
        description="S3 or Cloudinary URL of the uploaded menu file (PDF/image)",
    )
    file_type: str = Field(
        ...,
        description="MIME type of the uploaded file",
        pattern=r"^(application/pdf|image/(jpeg|png|webp))$",
    )
    language: str = Field(
        default="en",
        description="ISO 639-1 language code for the menu",
    )
    currency: str = Field(
        default="ZAR",
        description="ISO 4217 currency code",
    )


class ExtractedMenuItem(BaseModel):
    """A single menu item extracted from the document"""

    name: str = Field(..., description="Menu item name", max_length=80)
    description: Optional[str] = Field(
        None,
        description="Menu item description",
        max_length=300,
    )
    price: float = Field(..., description="Price in specified currency", gt=0)
    category: str = Field(..., description="Inferred category name")
    allergens: list[AllergenType] = Field(
        default_factory=list,
        description="Detected allergens",
    )
    is_vegetarian: bool = Field(
        default=False,
        description="Whether the item is vegetarian",
    )
    is_vegan: bool = Field(
        default=False,
        description="Whether the item is vegan",
    )
    preparation_time: Optional[int] = Field(
        None,
        description="Estimated preparation time in minutes",
        ge=1,
        le=180,
    )
    confidence_score: float = Field(
        ...,
        description="AI confidence score for this extraction (0.0-1.0)",
        ge=0.0,
        le=1.0,
    )


class ExtractedMenuCategory(BaseModel):
    """A category grouping extracted from the menu"""

    name: str = Field(..., description="Category name", max_length=50)
    display_order: int = Field(..., description="Suggested display order", ge=0)
    items: list[ExtractedMenuItem] = Field(
        default_factory=list,
        description="Items in this category",
    )


class MenuExtractionResult(BaseModel):
    """Complete result of menu extraction"""

    partner_id: str = Field(..., description="UUID of the partner")
    categories: list[ExtractedMenuCategory] = Field(
        default_factory=list,
        description="Extracted categories with items",
    )
    total_items: int = Field(..., description="Total number of items extracted", ge=0)
    average_confidence: float = Field(
        ...,
        description="Average confidence score across all items",
        ge=0.0,
        le=1.0,
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Extraction warnings (e.g., low confidence items)",
    )
    raw_text: Optional[str] = Field(
        None,
        description="Raw extracted text from OCR (for debugging)",
    )
    processing_time_ms: int = Field(
        ...,
        description="Total processing time in milliseconds",
        ge=0,
    )


class MenuExtractionStatus(BaseModel):
    """Status response for async extraction jobs"""

    job_id: str = Field(..., description="UUID of the extraction job")
    partner_id: str = Field(..., description="UUID of the partner")
    status: str = Field(
        ...,
        description="Job status",
        pattern=r"^(pending|processing|completed|failed)$",
    )
    progress: float = Field(
        default=0.0,
        description="Progress percentage (0.0-1.0)",
        ge=0.0,
        le=1.0,
    )
    result: Optional[MenuExtractionResult] = Field(
        None,
        description="Extraction result (populated when completed)",
    )
    error: Optional[str] = Field(
        None,
        description="Error message (populated when failed)",
    )
