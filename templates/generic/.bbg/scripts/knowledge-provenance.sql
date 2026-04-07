-- stale pages
SELECT path, freshness_status, stale_reason, last_updated
FROM knowledge_pages
WHERE freshness_status != 'current'
ORDER BY last_updated ASC;

-- open contradictions
SELECT page_a_path, page_b_path, issue_type, resolution_status, detected_at
FROM knowledge_contradictions
WHERE resolution_status = 'open'
ORDER BY detected_at DESC;

-- pages missing summary levels
WITH required_levels(summary_level) AS (
  VALUES ('L0'), ('L1'), ('L2')
)
SELECT p.path, required_levels.summary_level
FROM knowledge_pages p
CROSS JOIN required_levels
LEFT JOIN knowledge_page_summaries s
  ON s.page_path = p.path AND s.summary_level = required_levels.summary_level
WHERE s.id IS NULL
ORDER BY p.path ASC, required_levels.summary_level ASC;

-- pending candidate promotions
SELECT source_kind, source_ref, proposed_page_path, status, rationale, created_at
FROM knowledge_candidate_updates
WHERE status = 'pending'
ORDER BY created_at DESC;
