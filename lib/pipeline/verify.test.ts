import { describe, expect, it } from "vitest";
import type { MappedClause } from "@/lib/schemas";
import { splitClauses } from "@/lib/search/clauses";
import { normalizeText, verifyClauses } from "./verify";

const doc = {
  url: "https://flk.npc.gov.cn/detail?id=1",
  title: "中华人民共和国治安管理处罚法",
  content: `第四十三条　殴打他人的，或者故意伤害他人身体的，处五日以上十日以下拘留，并处二百元以上五百元以下罚款。
第四十二条 有下列行为之一的，处五日以下拘留或者五百元以下罚款：（二）公然侮辱他人或者捏造事实诽谤他人的；`,
};
const clauses = splitClauses(doc);

function mapped(overrides: Partial<MappedClause>): MappedClause {
  return {
    clauseId: `${doc.url}#第四十三条`,
    lawName: "中华人民共和国治安管理处罚法",
    article: "第四十三条",
    quote: "殴打他人的，或者故意伤害他人身体的，处五日以上十日以下拘留",
    sourceUrl: doc.url,
    relevance: "high",
    howItApplies: "",
    ...overrides,
  };
}

describe("normalizeText", () => {
  it("ignores whitespace, punctuation and full-width differences", () => {
    expect(normalizeText("殴打他人的， 或者\n故意伤害")).toBe(normalizeText("殴打他人的,或者故意伤害"));
  });
});

describe("verifyClauses", () => {
  it("verifies exact quotes", () => {
    const [c] = verifyClauses([mapped({})], clauses, [doc]);
    expect(c.verified).toBe(true);
  });

  it("tolerates punctuation and spacing differences", () => {
    const [c] = verifyClauses([mapped({ quote: "殴打他人的,或者 故意伤害他人身体的" })], clauses, [doc]);
    expect(c.verified).toBe(true);
  });

  it("flags fabricated quotes", () => {
    const [c] = verifyClauses([mapped({ quote: "殴打他人的，处十五日以上二十日以下拘留" })], clauses, [doc]);
    expect(c.verified).toBe(false);
  });

  it("overrides model-provided metadata with the retrieved clause", () => {
    const [c] = verifyClauses([mapped({ article: "第九十九条", sourceUrl: "https://fake.example" })], clauses, [doc]);
    expect(c.verified).toBe(true);
    expect(c.article).toBe("第四十三条");
    expect(c.sourceUrl).toBe(doc.url);
  });

  it("falls back to searching full documents when clauseId is wrong", () => {
    const [c] = verifyClauses(
      [mapped({ clauseId: "unknown", article: "第四十二条", quote: "公然侮辱他人或者捏造事实诽谤他人的" })],
      clauses,
      [doc],
    );
    expect(c.verified).toBe(true);
    expect(c.sourceUrl).toBe(doc.url);
  });

  it("rejects quotes too short to be meaningful", () => {
    const [c] = verifyClauses([mapped({ quote: "殴打" })], clauses, [doc]);
    expect(c.verified).toBe(false);
  });

  it("dedupes and sorts verified clauses first", () => {
    const result = verifyClauses(
      [mapped({ quote: "编造的内容编造的内容" }), mapped({}), mapped({})],
      clauses,
      [doc],
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.verified)).toEqual([true, false]);
  });
});
