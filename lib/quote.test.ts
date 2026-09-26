import { describe, expect, it } from "vitest";
import { locateQuote, normalizeText } from "./quote";

describe("normalizeText", () => {
  it("ignores whitespace, punctuation and full-width differences", () => {
    expect(normalizeText("殴打他人的， 或者\n故意伤害")).toBe(normalizeText("殴打他人的,或者故意伤害"));
    expect(normalizeText("ＡＢＣ１２３")).toBe("ABC123");
  });
});

describe("locateQuote", () => {
  const text = "第五十一条　殴打他人的，或者故意伤害他人身体的，处五日以上十日以下拘留。";

  it("finds an exact quote", () => {
    const range = locateQuote(text, "故意伤害他人身体的")!;
    expect(text.slice(range.start, range.end)).toBe("故意伤害他人身体的");
  });

  it("maps a loosely matched quote back to the original span", () => {
    const range = locateQuote(text, "殴打他人的,或者 故意伤害")!;
    expect(text.slice(range.start, range.end)).toBe("殴打他人的，或者故意伤害");
  });

  it("handles characters outside the BMP", () => {
    const withEmoji = "前文😀殴打他人的";
    const range = locateQuote(withEmoji, "殴打他人")!;
    expect(withEmoji.slice(range.start, range.end)).toBe("殴打他人");
  });

  it("returns null when the quote is absent or empty", () => {
    expect(locateQuote(text, "处十五日以上拘留")).toBeNull();
    expect(locateQuote(text, "，。")).toBeNull();
  });
});
