---
name: prompt-engineering
category: ai
description: Prompt patterns covering chain-of-thought, few-shot, system prompts, token optimization, output formatting, and guardrails
---

# Prompt Engineering

## Overview
Load this skill when designing prompts for LLM-powered features, optimizing model output quality, reducing token costs, or implementing safety guardrails. Prompts are the interface between your application and the model — treat them as code: version, test, and iterate.

## Key Patterns

### Prompt Structure
1. **System prompt** — Role, constraints, and behavioral rules; sets the persistent context
2. **User context** — Relevant data the model needs: documents, code, conversation history
3. **Instruction** — The specific task to perform, stated clearly and unambiguously
4. **Output format** — Explicitly define the expected structure: JSON schema, markdown format, or enumerated options
5. **Examples** — Few-shot demonstrations of input-output pairs showing the desired behavior

### Chain-of-thought (CoT)
- Ask the model to reason step-by-step before answering: "Think through this step by step"
- Improves accuracy on math, logic, multi-step reasoning, and code generation tasks
- **Structured CoT** — Define reasoning steps: "1. Identify the problem 2. List constraints 3. Generate solution 4. Verify"
- For classification: "First explain your reasoning, then provide your classification on the last line"
- Cost tradeoff: CoT uses more output tokens; disable for simple tasks where accuracy is already high

### Few-shot Prompting
- Include 2-5 representative examples of desired input-output behavior
- Cover edge cases in examples — the model generalizes from the patterns you show
- Order examples from simple to complex
- Match the format of examples exactly to what you want the model to produce
- For classification, include examples of each category to reduce bias

### System Prompt Design
- Define the role: "You are a code reviewer specializing in TypeScript security"
- Set explicit constraints: "Never suggest changes to the public API surface"
- Define what to do AND what not to do — models follow explicit prohibitions
- Keep system prompts focused — one role per prompt; do not overload with contradictory instructions
- Version system prompts and track their effectiveness over time

### Token Optimization
- Front-load critical context — models attend more strongly to the beginning and end of the prompt
- Compress reference material: summarize documents before including them in context
- Use structured data (JSON, tables) over prose for factual context — more information per token
- Remove redundant instructions — if the examples demonstrate the behavior, remove the verbose explanation
- Batch related questions into one prompt instead of making multiple calls

### Output Formatting
- Request JSON output with an explicit schema: field names, types, and required/optional
- Use XML tags or markdown headers to structure multi-part responses
- Ask for confidence scores when classification certainty matters
- Specify length constraints: "Respond in 2-3 sentences" or "Maximum 100 words"
- For code generation: specify language, style, and whether to include comments

### Guardrails
- Input validation — filter or reject prompts containing injection attempts
- Output validation — parse model output against expected schema; retry on format failures
- Content filtering — check outputs for PII, harmful content, or off-topic responses
- Grounding — provide source documents and instruct the model to cite them; reject unsourced claims
- Fallback — when model output fails validation after retries, return a safe default response

## Best Practices
- Test prompts with diverse inputs including adversarial edge cases
- A/B test prompt variations — small wording changes can significantly impact output quality
- Log prompts and completions for debugging (redact sensitive data)
- Separate concerns — use different prompts for different tasks rather than one mega-prompt
- Iterate on prompts like code — measure quality, refine, re-measure
- Pin the model version in production — model updates can change behavior

## Anti-patterns
- Vague instructions — "Be helpful" tells the model nothing actionable
- Contradictory constraints — "Be concise" and "Explain everything in detail"
- Including irrelevant context — wastes tokens and confuses the model
- Assuming the model will follow implicit conventions — be explicit about format and constraints
- No output validation — trusting raw model output without parsing or checking
- Prompt injection blindness — concatenating user input directly into prompts without sanitization

## Checklist
- [ ] System prompt defines a clear role, constraints, and behavioral rules
- [ ] Output format explicitly specified with schema or examples
- [ ] Few-shot examples cover happy path and edge cases
- [ ] Chain-of-thought enabled for complex reasoning tasks
- [ ] Token usage optimized — context is compressed and relevant
- [ ] Input sanitization prevents prompt injection
- [ ] Output validation checks format, content, and safety
- [ ] Prompts version-controlled and tested with diverse inputs
- [ ] Fallback behavior defined for model output failures
- [ ] Model version pinned in production; prompt updates tested before deploy
