export function createUnifiedPatch(
  previousContent: string,
  nextContent: string,
  fromLabel = "stored",
  toLabel = "rendered",
): string {
  const beforeLines = previousContent.split(/\r?\n/);
  const afterLines = nextContent.split(/\r?\n/);

  let prefixLen = 0;
  const maxPrefix = Math.min(beforeLines.length, afterLines.length);
  while (prefixLen < maxPrefix && beforeLines[prefixLen] === afterLines[prefixLen]) {
    prefixLen += 1;
  }

  let suffixLen = 0;
  const maxSuffix = Math.min(beforeLines.length - prefixLen, afterLines.length - prefixLen);
  while (
    suffixLen < maxSuffix &&
    beforeLines[beforeLines.length - 1 - suffixLen] === afterLines[afterLines.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  const removed = beforeLines.slice(prefixLen, beforeLines.length - suffixLen);
  const added = afterLines.slice(prefixLen, afterLines.length - suffixLen);

  const oldStart = prefixLen + 1;
  const newStart = prefixLen + 1;
  const oldCount = removed.length;
  const newCount = added.length;

  const hunk: string[] = [];
  for (const line of removed) {
    hunk.push(`-${line}`);
  }
  for (const line of added) {
    hunk.push(`+${line}`);
  }

  return [`--- ${fromLabel}`, `+++ ${toLabel}`, `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, ...hunk, ""].join(
    "\n",
  );
}
