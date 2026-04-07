# /wiki-lint

## Description
Audit the wiki for structural and content health issues so gaps, duplication, and weak maintenance signals can be corrected systematically.

## Usage
```
/wiki-lint
/wiki-lint docs/wiki/
/wiki-lint --focus concepts
```

## Process
1. **Scan the wiki** — Review wiki structure and relevant pages across `docs/wiki/`
2. **Find orphan pages** — Detect pages that are not reachable from `docs/wiki/index.md` or related links
3. **Check source coverage** — Identify pages with missing source references or claims that cannot be traced cleanly
4. **Flag stale content** — Note statements that appear outdated, unsupported, or in conflict with newer material
5. **Review linking quality** — Detect weak cross-links and duplicate concepts that should be merged, linked, or clarified
6. **Report fixes** — Produce a categorized report with actionable maintenance steps

## Lint Categories

### `orphan_pages`
- Report wiki pages that exist on disk but are not discoverable from `docs/wiki/index.md` or page `related` sections.
- For each finding, include the affected file path and a suggested remediation such as adding the page to the index, adding a relevant cross-link, or archiving the page explicitly.

### `missing_sources`
- Report formal wiki pages whose frontmatter is missing `sources` or whose sourcing is too weak to trace the page back to durable inputs.
- For each finding, include the affected file path and a suggested remediation such as adding the correct raw document path or marking the page for evidence review.

### `duplicate_topics`
- Report pages that appear to describe the same concept, decision, report, or process under different names.
- For each finding, include the affected file paths and a suggested remediation such as consolidating into one canonical page, cross-linking related pages, or marking one page as superseded.

### `weak_cross_links`
- Report pages that have thin or missing links to adjacent wiki knowledge needed for navigation and maintenance.
- For each finding, include the affected file path and a suggested remediation such as adding `related` entries, index links, or neighboring page references.

### `stale_candidates`
- Report pages whose claims, status, or timestamps suggest they may no longer match the current evidence.
- For each finding, include the affected file path and a suggested remediation such as reviewing new sources, marking the page `stale`, or updating the page in place.

## Output
- Categorized findings under `orphan_pages`, `missing_sources`, `duplicate_topics`, `weak_cross_links`, and `stale_candidates`
- Affected file paths for every finding
- Suggested remediation for every finding
- Prioritized summary of the most important wiki maintenance work

## Recommended Output Structure

```md
## Wiki Lint Report

### orphan_pages

- docs/wiki/concepts/foo.md — not linked from index or related sections

### missing_sources

- docs/wiki/reports/bar.md — frontmatter has no sources field
```

## Rules
- Review structure as well as content quality
- Group findings by category so follow-up work is easy to assign
- Prefer concrete, low-ambiguity fixes over general observations
- Flag duplicate concepts even when wording differs
- Call out stale or weakly supported claims instead of silently ignoring them
- Include file paths and a remediation suggestion in every category entry

## Examples
```
/wiki-lint
/wiki-lint docs/wiki/
/wiki-lint --focus decisions
```

## Related

- [Wiki Lint Skill](../skills/wiki-lint/SKILL.md)
- [Wiki Ingest Command](./wiki-ingest.md)
- [Wiki Query Command](./wiki-query.md)
