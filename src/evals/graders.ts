export interface EvalGradeResult {
  passed: boolean;
  failures: string[];
}

function gradeValue(expected: unknown, actual: unknown, path: string, failures: string[]): void {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`${path} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
    }
    return;
  }

  if (typeof expected === "object" && expected !== null) {
    if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
      failures.push(`${path} expected object but received ${JSON.stringify(actual)}`);
      return;
    }

    for (const [key, value] of Object.entries(expected)) {
      gradeValue(value, (actual as Record<string, unknown>)[key], `${path}.${key}`, failures);
    }
    return;
  }

  if (!Object.is(actual, expected)) {
    failures.push(`${path} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
  }
}

export function gradeDeterministicResult(expected: Record<string, unknown>, actual: Record<string, unknown>): EvalGradeResult {
  const failures: string[] = [];

  for (const [key, value] of Object.entries(expected)) {
    gradeValue(value, actual[key], key, failures);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
