import { generateShortCode } from "../../src/utils/shortCode";

describe("generateShortCode", () => {
  it("generates a code of the configured length", () => {
    const code = generateShortCode();
    expect(code).toHaveLength(7);
  });

  it("only uses unambiguous alphanumeric characters", () => {
    const code = generateShortCode();
    expect(code).toMatch(/^[23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });

  it("generates unique codes across many calls (extremely low collision probability)", () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateShortCode()));
    expect(codes.size).toBe(1000);
  });
});
