import { describe, expect, it } from "vitest";
import type { VerifiedClause } from "@/lib/schemas";
import { findClauseForRef, lawViewerHref } from "./law-links";

function clause(lawName: string, article: string): VerifiedClause {
  return {
    clauseId: `${lawName}#${article}`,
    lawName,
    article,
    quote: "",
    sourceUrl: "",
    relevance: "high",
    howItApplies: "",
    verified: true,
  };
}

const clauses = [
  clause("中华人民共和国治安管理处罚法", "第五十一条"),
  clause("中华人民共和国未成年人保护法", "第三十九条"),
  clause("中华人民共和国民法典", "第一千一百六十五条"),
  clause("中华人民共和国民法典", "第三十九条"),
];

describe("findClauseForRef", () => {
  it("matches law name and article", () => {
    expect(findClauseForRef("《治安管理处罚法》第五十一条", clauses)?.lawName).toBe("中华人民共和国治安管理处罚法");
    expect(findClauseForRef("民法典 第三十九条", clauses)?.lawName).toBe("中华人民共和国民法典");
  });

  it("matches an article alone when it is unambiguous", () => {
    expect(findClauseForRef("第一千一百六十五条", clauses)?.lawName).toBe("中华人民共和国民法典");
  });

  it("returns null for ambiguous or unknown references", () => {
    expect(findClauseForRef("第三十九条", clauses)).toBeNull();
    expect(findClauseForRef("刑法第二百三十四条", clauses)).toBeNull();
  });
});

describe("lawViewerHref", () => {
  it("encodes the target article and quote", () => {
    expect(lawViewerHref("abc", { article: "第五十一条", quote: "殴打他人的" })).toBe(
      `/law/abc?article=${encodeURIComponent("第五十一条")}&q=${encodeURIComponent("殴打他人的")}`,
    );
    expect(lawViewerHref("abc")).toBe("/law/abc");
  });
});
