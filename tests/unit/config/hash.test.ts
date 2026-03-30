import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../../src/config/hash.js";

describe("hash", () => {
  it("computes deterministic SHA-256", () => {
    expect(sha256Hex("bbg")).toBe("aa11c680c0a7bc6394afe7365d79cb1f4a8a5154ffbfa9d3d85fb9c0ba09a867");
  });

  it("hashes empty string", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("returns the same hash across repeated calls", () => {
    const value = "repeatable-input";

    expect(sha256Hex(value)).toBe(sha256Hex(value));
  });

  it("returns lowercase 64-character hex string", () => {
    expect(sha256Hex("bbg")).toMatch(/^[0-9a-f]{64}$/);
  });
});
