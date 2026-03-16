"""SCAMPER → TRIZ contradiction feedback loop (WP-3.5).

Processes SCAMPER-generated contradictions, deduplicates against existing ones
using SequenceMatcher, and inserts new entries into the Supabase contradictions table.
"""

import uuid
from difflib import SequenceMatcher

from app.core.supabase import get_supabase
from app.models.schemas import ScamperFeedbackResponse

SIMILARITY_THRESHOLD = 0.8


def _is_duplicate(description: str, existing_descriptions: list[str]) -> bool:
    """Return True if description is >80% similar to any existing one."""
    for existing in existing_descriptions:
        ratio = SequenceMatcher(None, description.lower(), existing.lower()).ratio()
        if ratio > SIMILARITY_THRESHOLD:
            return True
    return False


async def process_scamper_feedback(
    project_id: str,
    new_contradictions: list[dict],
) -> ScamperFeedbackResponse:
    """Process SCAMPER feedback contradictions with deduplication.

    Args:
        project_id: The project to add contradictions to.
        new_contradictions: List of dicts with 'description' and 'severity' keys.

    Returns:
        ScamperFeedbackResponse with created/deduplicated counts and IDs.
    """
    if not new_contradictions:
        return ScamperFeedbackResponse(
            created_count=0,
            deduplicated_count=0,
            contradiction_ids=[],
        )

    client = get_supabase()

    # Fetch existing contradictions for this project
    existing_result = (
        client.table("contradictions")
        .select("*")
        .eq("project_id", project_id)
        .execute()
    )
    existing_descriptions = [
        row["natural_description"]
        for row in (existing_result.data or [])
        if "natural_description" in row
    ]

    # Deduplicate and collect rows to insert
    to_insert: list[dict] = []
    deduplicated_count = 0

    for item in new_contradictions:
        desc = item.get("description", "")
        severity = item.get("severity", "minor")

        if _is_duplicate(desc, existing_descriptions):
            deduplicated_count += 1
            continue

        # Also check against items we are about to insert (within-batch dedup)
        batch_descriptions = [r["natural_description"] for r in to_insert]
        if _is_duplicate(desc, batch_descriptions):
            deduplicated_count += 1
            continue

        row_id = str(uuid.uuid4())
        to_insert.append({
            "id": row_id,
            "project_id": project_id,
            "natural_description": desc,
            "type": "TC",
            "severity": severity,
            "resolved": False,
        })

        # Track for within-batch dedup
        existing_descriptions.append(desc)

    # Bulk insert non-duplicates
    created_ids: list[str] = []
    if to_insert:
        insert_result = client.table("contradictions").insert(to_insert).execute()
        created_ids = [row["id"] for row in (insert_result.data or [])]

    return ScamperFeedbackResponse(
        created_count=len(created_ids),
        deduplicated_count=deduplicated_count,
        contradiction_ids=created_ids,
    )
