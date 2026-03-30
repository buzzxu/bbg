import { describe, expect, it } from "vitest";
import {
  BbgAnalyzerError,
  BbgConfigError,
  BbgError,
  BbgGitError,
  BbgTemplateError,
} from "../../../src/utils/errors.js";

describe("utils/errors", () => {
  it("creates BbgError with proper metadata", () => {
    const error = new BbgError("base failure", "E_BASE", "try again");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BbgError);
    expect(error.name).toBe("BbgError");
    expect(error.message).toBe("base failure");
    expect(error.code).toBe("E_BASE");
    expect(error.hint).toBe("try again");
  });

  it("keeps subclass inheritance chain", () => {
    const configError = new BbgConfigError("bad config", "E_CONFIG");
    const gitError = new BbgGitError(
      "git failed",
      "E_GIT",
      "check git installation",
    );
    const analyzerError = new BbgAnalyzerError("analyzer failed", "E_ANALYZER");
    const templateError = new BbgTemplateError("template failed", "E_TEMPLATE");

    expect(configError).toBeInstanceOf(BbgError);
    expect(configError.name).toBe("BbgConfigError");

    expect(gitError).toBeInstanceOf(BbgError);
    expect(gitError.name).toBe("BbgGitError");
    expect(gitError.code).toBe("E_GIT");
    expect(gitError.hint).toBe("check git installation");

    expect(analyzerError).toBeInstanceOf(BbgError);
    expect(analyzerError.name).toBe("BbgAnalyzerError");

    expect(templateError).toBeInstanceOf(BbgError);
    expect(templateError.name).toBe("BbgTemplateError");
  });

  it("passes through cause when provided", () => {
    const cause = new Error("root cause");
    const error = new BbgGitError(
      "clone failed",
      "E_GIT_CLONE",
      "verify network access",
      cause,
    );

    expect(error.cause).toBe(cause);
    expect(error.code).toBe("E_GIT_CLONE");
    expect(error.hint).toBe("verify network access");
  });
});
