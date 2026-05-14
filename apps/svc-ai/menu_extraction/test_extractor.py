"""
Menu Extraction Pipeline Tests
@module svc-ai/menu_extraction/test_extractor
@description Unit tests for menu extraction validation and pipeline
@phase P201 - Storefront Service Unit Tests
"""

from __future__ import annotations

import pytest

from .extractor import MenuExtractionError, validate_extracted_items
from .models import (
    AllergenType,
    ExtractedMenuCategory,
    ExtractedMenuItem,
    MenuExtractionRequest,
    MenuExtractionResult,
)


class TestMenuExtractionRequest:
    """Tests for MenuExtractionRequest model validation"""

    def test_valid_request(self) -> None:
        request = MenuExtractionRequest(
            partner_id="abc-123",
            file_url="https://s3.amazonaws.com/lmg-assets/menu.pdf",
            file_type="application/pdf",
        )
        assert request.partner_id == "abc-123"
        assert request.currency == "ZAR"
        assert request.language == "en"

    def test_default_currency_is_zar(self) -> None:
        request = MenuExtractionRequest(
            partner_id="abc-123",
            file_url="https://example.com/menu.pdf",
            file_type="application/pdf",
        )
        assert request.currency == "ZAR"

    def test_image_file_types(self) -> None:
        for file_type in ["image/jpeg", "image/png", "image/webp"]:
            request = MenuExtractionRequest(
                partner_id="abc-123",
                file_url="https://example.com/menu.jpg",
                file_type=file_type,
            )
            assert request.file_type == file_type

    def test_invalid_file_type_rejected(self) -> None:
        with pytest.raises(Exception):
            MenuExtractionRequest(
                partner_id="abc-123",
                file_url="https://example.com/menu.doc",
                file_type="application/msword",
            )


class TestExtractedMenuItem:
    """Tests for ExtractedMenuItem model validation"""

    def test_valid_item(self) -> None:
        item = ExtractedMenuItem(
            name="Quarter Mutton Bunny",
            description="Classic quarter loaf with mutton curry",
            price=89.99,
            category="Bunny Chow",
            allergens=[AllergenType.GLUTEN, AllergenType.DAIRY],
            is_vegetarian=False,
            is_vegan=False,
            confidence_score=0.95,
        )
        assert item.name == "Quarter Mutton Bunny"
        assert item.price == 89.99
        assert len(item.allergens) == 2

    def test_price_must_be_positive(self) -> None:
        with pytest.raises(Exception):
            ExtractedMenuItem(
                name="Test Item",
                price=-10.0,
                category="Test",
                confidence_score=0.5,
            )

    def test_confidence_score_range(self) -> None:
        item = ExtractedMenuItem(
            name="Test Item",
            price=50.0,
            category="Test",
            confidence_score=0.75,
        )
        assert 0.0 <= item.confidence_score <= 1.0

    def test_confidence_score_out_of_range(self) -> None:
        with pytest.raises(Exception):
            ExtractedMenuItem(
                name="Test Item",
                price=50.0,
                category="Test",
                confidence_score=1.5,
            )

    def test_name_max_length(self) -> None:
        long_name = "A" * 81
        with pytest.raises(Exception):
            ExtractedMenuItem(
                name=long_name,
                price=50.0,
                category="Test",
                confidence_score=0.5,
            )

    def test_optional_fields_default(self) -> None:
        item = ExtractedMenuItem(
            name="Simple Item",
            price=25.0,
            category="Drinks",
            confidence_score=0.9,
        )
        assert item.description is None
        assert item.preparation_time is None
        assert item.is_vegetarian is False
        assert item.is_vegan is False
        assert len(item.allergens) == 0


class TestValidateExtractedItems:
    """Tests for the validate_extracted_items function"""

    def test_valid_categories(self) -> None:
        raw_categories = [
            {
                "name": "Starters",
                "items": [
                    {
                        "name": "Samosa",
                        "description": "Crispy pastry with spiced filling",
                        "price": 45.0,
                        "category": "Starters",
                        "allergens": ["gluten"],
                        "is_vegetarian": True,
                        "is_vegan": False,
                        "confidence_score": 0.92,
                    },
                ],
            },
        ]

        categories, warnings = validate_extracted_items(raw_categories)
        assert len(categories) == 1
        assert len(categories[0].items) == 1
        assert categories[0].items[0].name == "Samosa"

    def test_skips_empty_names(self) -> None:
        raw_categories = [
            {
                "name": "Starters",
                "items": [
                    {"name": "", "price": 45.0, "confidence_score": 0.9},
                    {"name": "Valid Item", "price": 50.0, "confidence_score": 0.9},
                ],
            },
        ]

        categories, warnings = validate_extracted_items(raw_categories)
        assert len(categories[0].items) == 1
        assert any("empty name" in w for w in warnings)

    def test_skips_invalid_prices(self) -> None:
        raw_categories = [
            {
                "name": "Mains",
                "items": [
                    {"name": "Free Item", "price": 0, "confidence_score": 0.9},
                    {"name": "Negative", "price": -10, "confidence_score": 0.9},
                    {"name": "Valid", "price": 100, "confidence_score": 0.9},
                ],
            },
        ]

        categories, warnings = validate_extracted_items(raw_categories)
        assert len(categories[0].items) == 1
        assert categories[0].items[0].name == "Valid"

    def test_warns_on_high_prices(self) -> None:
        raw_categories = [
            {
                "name": "Premium",
                "items": [
                    {
                        "name": "Expensive Item",
                        "price": 15000,
                        "confidence_score": 0.9,
                    },
                ],
            },
        ]

        categories, warnings = validate_extracted_items(raw_categories)
        assert len(categories[0].items) == 1
        assert any("Suspiciously high" in w for w in warnings)

    def test_deduplicates_items(self) -> None:
        raw_categories = [
            {
                "name": "Mains",
                "items": [
                    {"name": "Bunny Chow", "price": 89, "confidence_score": 0.9},
                    {"name": "bunny chow", "price": 89, "confidence_score": 0.8},
                ],
            },
        ]

        categories, warnings = validate_extracted_items(raw_categories)
        assert len(categories[0].items) == 1
        assert any("Duplicate" in w for w in warnings)

    def test_warns_low_confidence(self) -> None:
        raw_categories = [
            {
                "name": "Uncertain",
                "items": [
                    {
                        "name": "Maybe Item",
                        "price": 50,
                        "confidence_score": 0.3,
                    },
                ],
            },
        ]

        categories, warnings = validate_extracted_items(raw_categories)
        assert len(categories[0].items) == 1
        assert any("Low confidence" in w for w in warnings)

    def test_parses_valid_allergens(self) -> None:
        raw_categories = [
            {
                "name": "Mains",
                "items": [
                    {
                        "name": "Pasta",
                        "price": 85,
                        "allergens": ["gluten", "dairy", "invalid_allergen"],
                        "confidence_score": 0.9,
                    },
                ],
            },
        ]

        categories, warnings = validate_extracted_items(raw_categories)
        item = categories[0].items[0]
        assert len(item.allergens) == 2
        assert AllergenType.GLUTEN in item.allergens
        assert AllergenType.DAIRY in item.allergens

    def test_empty_categories_excluded(self) -> None:
        raw_categories = [
            {"name": "Empty", "items": []},
            {
                "name": "Has Items",
                "items": [
                    {"name": "Item", "price": 50, "confidence_score": 0.9},
                ],
            },
        ]

        categories, _ = validate_extracted_items(raw_categories)
        assert len(categories) == 1
        assert categories[0].name == "Has Items"

    def test_truncates_long_names(self) -> None:
        raw_categories = [
            {
                "name": "A" * 100,
                "items": [
                    {
                        "name": "B" * 100,
                        "price": 50,
                        "confidence_score": 0.9,
                    },
                ],
            },
        ]

        categories, _ = validate_extracted_items(raw_categories)
        assert len(categories[0].name) <= 50
        assert len(categories[0].items[0].name) <= 80


class TestMenuExtractionResult:
    """Tests for MenuExtractionResult model"""

    def test_valid_result(self) -> None:
        result = MenuExtractionResult(
            partner_id="abc-123",
            categories=[],
            total_items=0,
            average_confidence=0.0,
            warnings=[],
            processing_time_ms=1500,
        )
        assert result.partner_id == "abc-123"
        assert result.total_items == 0

    def test_result_with_categories(self) -> None:
        result = MenuExtractionResult(
            partner_id="abc-123",
            categories=[
                ExtractedMenuCategory(
                    name="Mains",
                    display_order=0,
                    items=[
                        ExtractedMenuItem(
                            name="Bunny Chow",
                            price=89.99,
                            category="Mains",
                            confidence_score=0.95,
                        ),
                    ],
                ),
            ],
            total_items=1,
            average_confidence=0.95,
            processing_time_ms=2500,
        )
        assert len(result.categories) == 1
        assert result.total_items == 1


class TestMenuExtractionError:
    """Tests for custom MenuExtractionError"""

    def test_error_with_stage(self) -> None:
        error = MenuExtractionError("OCR failed", stage="textract")
        assert error.stage == "textract"
        assert "textract" in str(error)
        assert "OCR failed" in str(error)

    def test_error_stages(self) -> None:
        for stage in ["textract", "llm", "pipeline"]:
            error = MenuExtractionError("test", stage=stage)
            assert error.stage == stage
