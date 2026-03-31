import { afterEach, describe, expect, it, vi } from "vitest";
import { createTemplateEngine } from "../../../src/templates/engine.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("createTemplateEngine", () => {
  it("returns a Handlebars instance with a compile method", () => {
    const engine = createTemplateEngine();
    expect(typeof engine.compile).toBe("function");
  });

  it("compiles and renders a simple template", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("Hello {{name}}");
    expect(template({ name: "World" })).toBe("Hello World");
  });
});

describe("if-eq helper", () => {
  it("renders the true block when values are strictly equal", () => {
    const engine = createTemplateEngine();
    const template = engine.compile(
      "{{#if-eq status 'active'}}YES{{else}}NO{{/if-eq}}",
    );
    expect(template({ status: "active" })).toBe("YES");
  });

  it("renders the else block when values differ", () => {
    const engine = createTemplateEngine();
    const template = engine.compile(
      "{{#if-eq status 'active'}}YES{{else}}NO{{/if-eq}}",
    );
    expect(template({ status: "inactive" })).toBe("NO");
  });

  it("uses strict equality (string '1' vs number 1 from context)", () => {
    const engine = createTemplateEngine();
    // Handlebars passes integer literals as numbers, so count=1 matches literal 1
    const templateMatch = engine.compile(
      "{{#if-eq count 1}}MATCH{{else}}NO-MATCH{{/if-eq}}",
    );
    expect(templateMatch({ count: 1 })).toBe("MATCH");

    // But a string "1" in context does not match number literal 1
    expect(templateMatch({ count: "1" })).toBe("NO-MATCH");
  });

  it("renders inverse block when no else is provided and values differ", () => {
    const engine = createTemplateEngine();
    const template = engine.compile(
      "{{#if-eq status 'active'}}YES{{/if-eq}}",
    );
    expect(template({ status: "inactive" })).toBe("");
  });
});

describe("if-includes helper", () => {
  it("renders the true block when array includes the value", () => {
    const engine = createTemplateEngine();
    const template = engine.compile(
      "{{#if-includes languages 'java'}}HAS-JAVA{{else}}NO-JAVA{{/if-includes}}",
    );
    expect(template({ languages: ["java", "typescript"] })).toBe("HAS-JAVA");
  });

  it("renders the else block when array does not include the value", () => {
    const engine = createTemplateEngine();
    const template = engine.compile(
      "{{#if-includes languages 'python'}}HAS-PYTHON{{else}}NO-PYTHON{{/if-includes}}",
    );
    expect(template({ languages: ["java", "typescript"] })).toBe("NO-PYTHON");
  });

  it("renders the else block when value is not an array", () => {
    const engine = createTemplateEngine();
    const template = engine.compile(
      "{{#if-includes notAnArray 'x'}}YES{{else}}NO{{/if-includes}}",
    );
    expect(template({ notAnArray: "a string" })).toBe("NO");
  });

  it("renders the else block when value is undefined", () => {
    const engine = createTemplateEngine();
    const template = engine.compile(
      "{{#if-includes missing 'x'}}YES{{else}}NO{{/if-includes}}",
    );
    expect(template({})).toBe("NO");
  });
});

describe("join helper", () => {
  it("joins array elements with an explicit separator", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{join items ', '}}}");
    expect(template({ items: ["a", "b", "c"] })).toBe("a, b, c");
  });

  it("joins array elements with a custom separator", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{join items ' | '}}}");
    expect(template({ items: ["x", "y", "z"] })).toBe("x | y | z");
  });

  it("returns empty string for non-array input", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{join notArray ', '}}}");
    expect(template({ notArray: "hello" })).toBe("");
  });

  it("returns empty string for undefined input", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{join missing ', '}}}");
    expect(template({})).toBe("");
  });

  it("handles single-element array", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{join items ', '}}}");
    expect(template({ items: ["only"] })).toBe("only");
  });

  it("handles empty array", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{join items ', '}}}");
    expect(template({ items: [] })).toBe("");
  });
});

describe("date helper", () => {
  it("returns YYYY-MM-DD formatted date with explicit format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T10:11:12.000Z"));

    const engine = createTemplateEngine();
    const template = engine.compile("{{{date 'YYYY-MM-DD'}}}");
    expect(template({})).toBe("2026-03-29");
  });

  it("returns ISO string for non-standard format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T10:11:12.000Z"));

    const engine = createTemplateEngine();
    const template = engine.compile("{{{date 'ISO'}}}");
    expect(template({})).toBe("2026-03-29T10:11:12.000Z");
  });

  it("returns ISO string when called without arguments (options object passed as format)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T10:11:12.000Z"));

    const engine = createTemplateEngine();
    // When called as {{{date}}}, Handlebars passes the options hash as first arg,
    // which gets stringified to "[object Object]", which !== "YYYY-MM-DD",
    // so formatDate returns toISOString().
    const template = engine.compile("{{{date}}}");
    expect(template({})).toBe("2026-03-29T10:11:12.000Z");
  });
});

describe("indent helper", () => {
  it("indents a single line by the specified count", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{indent 4 text}}}");
    expect(template({ text: "hello" })).toBe("    hello");
  });

  it("indents each line of multiline text", () => {
    const engine = createTemplateEngine();
    // Use literal string with \\n which the helper normalizes to real newlines
    const template = engine.compile("{{{indent 2 'line1\\nline2\\nline3'}}}");
    expect(template({})).toBe("  line1\n  line2\n  line3");
  });

  it("handles zero indent", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{indent 0 text}}}");
    expect(template({ text: "hello" })).toBe("hello");
  });

  it("handles null/undefined text gracefully", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{indent 4 missing}}}");
    // missing is undefined, String(undefined) = "undefined"... wait,
    // the code does String(text ?? "") which would be "" for undefined
    expect(template({})).toBe("    ");
  });

  it("handles negative count by treating as zero spaces", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{indent -1 text}}}");
    // Math.max(-1, 0) = 0, so no indentation
    expect(template({ text: "hello" })).toBe("hello");
  });

  it("handles multiline text from context variable", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{indent 3 content}}}");
    expect(template({ content: "a\nb\nc" })).toBe("   a\n   b\n   c");
  });
});

describe("risk-table helper", () => {
  it("renders a markdown table from valid thresholds", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{risk-table thresholds}}}");

    const result = template({
      thresholds: {
        high: { grade: "A+", minScore: 99 },
        medium: { grade: "A", minScore: 95 },
        low: { grade: "B", minScore: 85 },
      },
    });

    expect(result).toContain("| Risk | Grade | Min Score |");
    expect(result).toContain("| --- | --- | --- |");
    expect(result).toContain("| high | A+ | 99 |");
    expect(result).toContain("| medium | A | 95 |");
    expect(result).toContain("| low | B | 85 |");
  });

  it("returns empty string for null/undefined thresholds", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{risk-table thresholds}}}");
    expect(template({})).toBe("");
  });

  it("returns empty string for non-object thresholds", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{risk-table thresholds}}}");
    expect(template({ thresholds: "not-an-object" })).toBe("");
  });

  it("returns empty string when required keys are missing", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{risk-table thresholds}}}");
    expect(
      template({
        thresholds: { high: { grade: "A+", minScore: 99 } },
      }),
    ).toBe("");
  });

  it("renders full table structure with 5 lines", () => {
    const engine = createTemplateEngine();
    const template = engine.compile("{{{risk-table thresholds}}}");

    const result = template({
      thresholds: {
        high: { grade: "S", minScore: 100 },
        medium: { grade: "A", minScore: 90 },
        low: { grade: "C", minScore: 70 },
      },
    });

    const lines = result.split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe("| Risk | Grade | Min Score |");
    expect(lines[1]).toBe("| --- | --- | --- |");
    expect(lines[2]).toBe("| high | S | 100 |");
    expect(lines[3]).toBe("| medium | A | 90 |");
    expect(lines[4]).toBe("| low | C | 70 |");
  });
});
