#!/usr/bin/env node

/**
 * pre-edit-check.js — Pre-edit validation for code quality.
 * Checks for console.log, debugger statements, TODO without ticket,
 * and hardcoded secrets in the content being written.
 */

const SECRET_PATTERNS = [
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/g },
  { name: "GitHub Token", pattern: /ghp_[A-Za-z0-9_]{36}/g },
  { name: "Stripe Key", pattern: /sk-[A-Za-z0-9]{24,}/g },
  { name: "Generic Password", pattern: /password\s*[:=]\s*["'][^"']{4,}["']/gi },
  { name: "Generic Token", pattern: /token\s*[:=]\s*["'][^"']{8,}["']/gi },
  { name: "Private Key", pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
];

const WARN_PATTERNS = [
  { name: "console.log", pattern: /console\.log\(/g, severity: "warn" },
  { name: "debugger", pattern: /\bdebugger\b/g, severity: "warn" },
  { name: "TODO without ticket", pattern: /\/\/\s*TODO(?!\s*\([A-Z]+-\d+\))/g, severity: "info" },
  { name: "console.error (review)", pattern: /console\.error\(/g, severity: "info" },
];

function scanContent(content, filePath) {
  const issues = [];
  const isTs = filePath && /\.(ts|tsx)$/.test(filePath);

  for (const { name, pattern } of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({ severity: "error", message: `Hardcoded ${name} detected (${matches.length} occurrence(s))` });
    }
  }

  if (isTs || !filePath) {
    for (const { name, pattern, severity } of WARN_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({ severity, message: `${name} found (${matches.length} occurrence(s))` });
      }
    }
  }

  return issues;
}

async function main() {
  const input = await readStdin();
  let toolInput = {};

  try {
    toolInput = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const content = toolInput.content ?? toolInput.newString ?? "";
  const filePath = toolInput.filePath ?? toolInput.file_path ?? "";

  if (!content) {
    process.exit(0);
  }

  const issues = scanContent(content, filePath);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity !== "error");

  for (const w of warnings) {
    console.log(`[pre-edit] ${w.severity.toUpperCase()}: ${w.message}`);
  }

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`[pre-edit] BLOCKED: ${e.message}`);
    }
    process.exit(2);
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 1000);
  });
}

main().catch((err) => {
  console.error(`[pre-edit] Error: ${err.message}`);
  process.exit(1);
});
