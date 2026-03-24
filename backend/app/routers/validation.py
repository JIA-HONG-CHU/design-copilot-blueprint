"""Validation Passport — on-demand generation for any solution hypothesis."""

from fastapi import APIRouter

from app.models.schemas import ValidationPassportRequest, ValidationPassportResponse
from app.agents.evaluator import generate_validation_passport

router = APIRouter()


@router.post("/alternatives/validation-passport", response_model=ValidationPassportResponse)
def alternatives_validation_passport(req: ValidationPassportRequest):
    """Generate a self-declared validation passport for a solution hypothesis."""
    return generate_validation_passport(req)
