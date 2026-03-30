import Handlebars, { type HelperOptions } from "handlebars";

function formatDate(value: Date, format: string): string {
  if (format !== "YYYY-MM-DD") {
    return value.toISOString();
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderRiskTable(thresholds: {
  high: { grade: string; minScore: number };
  medium: { grade: string; minScore: number };
  low: { grade: string; minScore: number };
}): string {
  return [
    "| Risk | Grade | Min Score |",
    "| --- | --- | --- |",
    `| high | ${thresholds.high.grade} | ${thresholds.high.minScore} |`,
    `| medium | ${thresholds.medium.grade} | ${thresholds.medium.minScore} |`,
    `| low | ${thresholds.low.grade} | ${thresholds.low.minScore} |`,
  ].join("\n");
}

export function registerHelpers(engine: typeof Handlebars): void {
  engine.registerHelper("if-eq", function ifEq(
    this: unknown,
    left: unknown,
    right: unknown,
    options: HelperOptions,
  ) {
    return left === right ? options.fn(this) : options.inverse(this);
  });

  engine.registerHelper("if-includes", function ifIncludes(
    this: unknown,
    arrayLike: unknown,
    value: unknown,
    options: HelperOptions,
  ) {
    const hasValue = Array.isArray(arrayLike) && arrayLike.includes(value);
    return hasValue ? options.fn(this) : options.inverse(this);
  });

  engine.registerHelper("join", (arrayLike: unknown, separator = ", ") => {
    if (!Array.isArray(arrayLike)) {
      return "";
    }
    return arrayLike.join(String(separator));
  });

  engine.registerHelper("date", (format = "YYYY-MM-DD") => {
    return formatDate(new Date(), String(format));
  });

  engine.registerHelper("risk-table", (thresholds: unknown) => {
    if (
      thresholds &&
      typeof thresholds === "object" &&
      "high" in thresholds &&
      "medium" in thresholds &&
      "low" in thresholds
    ) {
      return renderRiskTable(
        thresholds as {
          high: { grade: string; minScore: number };
          medium: { grade: string; minScore: number };
          low: { grade: string; minScore: number };
        },
      );
    }

    return "";
  });

  engine.registerHelper("indent", (count: unknown, text: unknown) => {
    const spaces = Number.isFinite(Number(count)) ? " ".repeat(Math.max(Number(count), 0)) : "";
    const normalized = String(text ?? "").replaceAll("\\n", "\n");
    return normalized
      .split("\n")
      .map((line) => `${spaces}${line}`)
      .join("\n");
  });
}

export function createTemplateEngine(): typeof Handlebars {
  const engine = Handlebars.create();
  registerHelpers(engine);
  return engine;
}
