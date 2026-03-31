#!/usr/bin/env node

/**
 * security-scan.js — Scan for hardcoded secrets and block destructive commands.
 * Used as a PreToolUse hook for Bash to prevent dangerous operations
 * and detect API keys, tokens, and passwords.
 */

const DESTRUCTIVE_COMMANDS = [
  { pattern: /rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\/\s*$/m, name: "rm -rf /" },
  { pattern: /rm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+\/\s*$/m, name: "rm -rf /" },
  { pattern: /rm\s+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*\s+~\//m, name: "rm -rf ~/" },
  { pattern: /git\s+push\s+.*--force.*\s+(main|master)\b/m, name: "force push to main" },
  { pattern: /git\s+push\s+-f\s+.*\s+(main|master)\b/m, name: "force push to main" },
  { pattern: /mkfs\./m, name: "filesystem format" },
  { pattern: /dd\s+if=.*of=\/dev\//m, name: "dd to device" },
  { pattern: /:\(\)\{\s*:\|:&\s*\};:/m, name: "fork bomb" },
];

const SECRET_PATTERNS = [
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", pattern: /ghp_[A-Za-z0-9_]{36}/ },
  { name: "Stripe Secret Key", pattern: /sk-[A-Za-z0-9]{24,}/ },
  { name: "Stripe Restricted Key", pattern: /rk_live_[A-Za-z0-9]{24,}/ },
  { name: "Slack Token", pattern: /xox[bpors]-[A-Za-z0-9-]{10,}/ },
  { name: "Private Key Header", pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: "Generic Secret Assignment", pattern: /(secret|api_key|apikey|auth_token)\s*=\s*["'][^"']{8,}["']/i },
];

function scanCommand(command) {
  const blocked = [];
  const warnings = [];

  for (const { pattern, name } of DESTRUCTIVE_COMMANDS) {
    if (pattern.test(command)) {
      blocked.push(`Destructive command detected: ${name}`);
    }
  }

  for (const { pattern, name } of SECRET_PATTERNS) {
    if (pattern.test(command)) {
      warnings.push(`Potential ${name} found in command`);
    }
  }

  return { blocked, warnings };
}

async function main() {
  const input = await readStdin();
  let toolInput = {};

  try {
    toolInput = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const command = toolInput.command ?? toolInput.input ?? "";
  if (!command) {
    process.exit(0);
  }

  const { blocked, warnings } = scanCommand(command);

  for (const w of warnings) {
    console.log(`[security] WARNING: ${w}`);
  }

  if (blocked.length > 0) {
    for (const b of blocked) {
      console.error(`[security] BLOCKED: ${b}`);
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
  console.error(`[security] Error: ${err.message}`);
  process.exit(1);
});
