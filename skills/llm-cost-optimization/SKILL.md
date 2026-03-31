---
name: llm-cost-optimization
category: ai
description: LLM cost management covering model routing, caching, batching, token budgets, and fallback chains
---

# LLM Cost Optimization

## Overview
Load this skill when building LLM-powered products where inference cost, latency, and reliability matter. Unoptimized LLM usage can exceed compute costs by 10-100x — smart routing, caching, and budgeting make AI features sustainable at scale.

## Key Patterns

### Model Routing
1. **Classify task complexity** — Route simple tasks (classification, extraction, formatting) to smaller/cheaper models; reserve large models for complex reasoning
2. **Model tiers** — Fast/cheap (Haiku, GPT-4o-mini, Gemini Flash) → Balanced (Sonnet, GPT-4o) → Premium (Opus, o1, Gemini Ultra)
3. **Routing logic** — Use heuristics first (input length, task type); graduate to a classifier model for dynamic routing
4. **Quality threshold** — Define minimum acceptable quality per task; use the cheapest model that meets it
5. **Latency tiers** — Real-time user interaction needs fast models; background processing can use slower, cheaper models

### Prompt Caching
- **Exact match cache** — Hash the prompt; return cached response for identical requests (Redis, in-memory LRU)
- **Semantic cache** — Embed prompts; return cached response for semantically similar requests (vector DB + similarity threshold)
- **Provider caching** — Use Anthropic's prompt caching for shared prefixes; cache system prompts and large context blocks
- **Cache invalidation** — TTL-based for time-sensitive content; version-based for prompt changes
- **Cache hit rate target** — Track and optimize; 30-50% hit rate on production traffic significantly reduces cost

### Batching
- Collect multiple requests and process them in a single API call where the provider supports batch APIs
- Batch by priority: high-priority requests process immediately; low-priority requests queue for batch
- Use batch APIs (OpenAI Batch, Anthropic Message Batches) for background processing at 50% cost reduction
- Set maximum batch wait time — users should not perceive latency from batching
- Batch similar tasks together — same model, same system prompt, same output format

### Token Budget Management
- **Input budgets** — Truncate or summarize context to stay within cost-effective input sizes
- **Output budgets** — Set `max_tokens` to the expected response length plus a buffer; never leave unbounded
- **Per-request cost tracking** — Log input tokens, output tokens, model, and cost for every API call
- **Per-user budgets** — Allocate monthly token budgets per user tier; throttle or downgrade model when exceeded
- **Cost alerts** — Alert when daily spend exceeds 2x the trailing 7-day average

### Fallback Chains
- Primary model → fallback model → cached response → static fallback → error message
- Trigger fallback on: timeout, rate limit (429), server error (5xx), output validation failure
- Log every fallback activation — frequent fallbacks indicate primary model reliability issues
- Fallback models should be pre-tested for acceptable quality on your task
- Circuit breaker on the primary model — if failure rate exceeds threshold, route all traffic to fallback

### Context Window Optimization
- **Chunking** — Split large documents; process relevant chunks only, not the entire document
- **Retrieval-Augmented Generation (RAG)** — Retrieve only relevant context with vector search; include top-k results
- **Summarization chains** — Summarize long documents before including in prompt; progressive summarization for very long content
- **Context pruning** — In multi-turn conversations, summarize older messages; keep recent messages verbatim
- **Structured extraction** — Extract relevant fields from documents first; pass structured data to the reasoning model

## Best Practices
- Measure cost per feature, not just total spend — identify which features drive disproportionate cost
- Establish quality benchmarks before optimizing cost — you need to know when cheaper is too cheap
- Use streaming for user-facing responses — perceived latency drops while total latency stays the same
- Negotiate volume discounts and committed use pricing with providers
- Build model-agnostic abstractions — switching providers should be a config change, not a rewrite
- Review cost dashboards weekly; investigate anomalies immediately

## Anti-patterns
- Using the largest model for every task — most tasks do not need Opus-tier reasoning
- Unbounded `max_tokens` — costs spike on unexpectedly verbose responses
- No caching — identical requests hit the API repeatedly at full cost
- Optimizing latency at the expense of cost without measuring the tradeoff
- Hard-coding model names throughout the codebase — makes routing and switching impossible
- Ignoring batch API discounts for background workloads

## Checklist
- [ ] Model routing implemented — tasks classified and sent to appropriate model tier
- [ ] Prompt caching in place with measured hit rate
- [ ] Batch processing used for non-real-time workloads
- [ ] `max_tokens` set on every API call based on expected output size
- [ ] Per-request cost logged with input/output token counts
- [ ] Per-user or per-feature token budgets defined and enforced
- [ ] Fallback chain configured: primary → secondary → cache → static → error
- [ ] Cost alerts set for daily spend anomalies
- [ ] Context window optimized with RAG or summarization for large inputs
- [ ] Model abstraction layer in place — switching providers is a config change
