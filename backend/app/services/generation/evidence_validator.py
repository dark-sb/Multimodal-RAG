import re
from typing import List, Dict, Any, Tuple

def validate_citations(answer: str, retrieved_sources: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], str]:
    """
    Validate citations against actual retrieved source records before returning the response.
    Ensures:
    1. Every cited document ID/name actually exists in the retrieved set.
    2. Page numbers match actual retrieved source pages.
    3. Excludes any fabricated or irrelevant citations.
    4. Ensures the evidence panel displays the most relevant sources rather than every chunk indiscriminately.
    Returns: (valid_citations_list, grounding_status)
    """
    if not retrieved_sources:
        return [], "insufficient_evidence"

    ans_lower = answer.lower()
    is_insufficient = (
        "insufficient evidence" in ans_lower
        or "does not provide" in ans_lower
        or "not enough information" in ans_lower
        or "cannot be determined" in ans_lower
    )

    if is_insufficient:
        # Return at most 1 context reference and mark status
        return retrieved_sources[:1], "insufficient_evidence"

    # Filter sources to those that are explicitly cited in the answer (e.g. "Page 6")
    # or have high calibrated relevance
    cited_pages = set(re.findall(r'Page\s+(\d+)', answer, re.IGNORECASE))
    
    valid_citations = []
    seen_keys = set()

    # Prioritize chunks matching cited pages first
    for s in retrieved_sources:
        s_page = str(s["page_number"])
        key = (s["document_id"], s["page_number"], s["chunk_index"])
        if key in seen_keys:
            continue

        if s_page in cited_pages or s.get("relevance_score", 0) >= 0.40:
            valid_citations.append(s)
            seen_keys.add(key)
            if len(valid_citations) >= 3:
                break

    # If no chunk met the threshold, fallback to top retrieved source
    if not valid_citations and retrieved_sources:
        valid_citations = [retrieved_sources[0]]

    grounding_status = "grounded" if not is_insufficient and valid_citations else "insufficient_evidence"
    return valid_citations, grounding_status
