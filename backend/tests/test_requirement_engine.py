import pytest
from app.requirement_engine.parser import RequirementParser
from app.requirement_engine.schemas import RequirementAnalysis


@pytest.fixture
def parser() -> RequirementParser:
    return RequirementParser()


def test_basic_requirement_with_scale(parser: RequirementParser) -> None:
    """Test parsing a food delivery requirement with explicit concurrent users."""
    input_text = "Build a food delivery platform for 50,000 concurrent users."
    analysis = parser.analyze(input_text)

    assert isinstance(analysis, RequirementAnalysis)
    assert analysis.domain == "food_delivery"
    assert analysis.system_type in ["web_application", "mobile_application", "api_platform"]
    assert analysis.scale.expected_concurrent_users == 50000
    assert analysis.scale.expected_total_users is None
    assert len(analysis.functional_requirements) >= 3
    assert any("order" in r.lower() for r in analysis.functional_requirements)
    assert any("restaurant" in r.lower() for r in analysis.functional_requirements)
    assert any("delivery" in r.lower() or "tracking" in r.lower() for r in analysis.functional_requirements)
    assert analysis.confidence >= 0.70


def test_missing_scale_no_hallucinations(parser: RequirementParser) -> None:
    """Test that missing scale parameters are kept None and populated in missing_information."""
    input_text = "Build an online shopping application."
    analysis = parser.analyze(input_text)

    assert analysis.domain == "e_commerce"
    assert analysis.scale.expected_concurrent_users is None
    assert analysis.scale.expected_total_users is None
    assert analysis.scale.expected_requests_per_second is None
    assert any("user scale" in m.lower() or "concurrent" in m.lower() for m in analysis.missing_information)
    # Ensure no invented tech stack in assumptions
    assert not any("postgres" in a.lower() for a in analysis.assumptions)
    assert not any("aws" in a.lower() for a in analysis.assumptions)
    assert not any("redis" in a.lower() for a in analysis.assumptions)


def test_explicit_constraints_and_security(parser: RequirementParser) -> None:
    """Test banking requirement with explicit Azure constraint and high security priority."""
    input_text = "Build a banking application using Azure with high security."
    analysis = parser.analyze(input_text)

    assert analysis.domain == "fintech"
    assert any("azure" in c.lower() for c in analysis.constraints)
    assert any("security" in p.lower() for p in analysis.priorities)
    assert any("security" in n.lower() for n in analysis.non_functional_requirements)


def test_ambiguity_detection(parser: RequirementParser) -> None:
    """Test detecting ambiguous buzzwords without quantifiable metrics."""
    input_text = "Build a highly scalable platform."
    analysis = parser.analyze(input_text)

    assert analysis.scale.expected_concurrent_users is None
    assert len(analysis.ambiguities) >= 1
    assert any("scale is unspecified" in amb.lower() or "unspecified" in amb.lower() for amb in analysis.ambiguities)


def test_empty_input_validation(parser: RequirementParser) -> None:
    """Test that empty or whitespace-only requirements raise ValueError."""
    with pytest.raises(ValueError):
        parser.analyze("")
    with pytest.raises(ValueError):
        parser.analyze("   ")
