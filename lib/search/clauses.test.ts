import { describe, expect, it } from "vitest";
import { inferLawName, rankClauses, splitClauses } from "./clauses";

const LAW_TEXT = `中华人民共和国治安管理处罚法
第四十二条 有下列行为之一的，处五日以下拘留或者五百元以下罚款：
（一）写恐吓信或者以其他方法威胁他人人身安全的；
（二）公然侮辱他人或者捏造事实诽谤他人的；
第四十三条　殴打他人的，或者故意伤害他人身体的，处五日以上十日以下拘留，并处二百元以上五百元以下罚款。
有下列情形之一的，处十日以上十五日以下拘留，并处五百元以上一千元以下罚款：
（二）殴打、伤害残疾人、孕妇、不满十四周岁的人或者六十周岁以上的人的；
**第四十四条** 猥亵他人的，处五日以上十日以下拘留。依照本法第四十三条的规定从重处罚。
第一百条之一 测试条文。`;

describe("splitClauses", () => {
  const clauses = splitClauses({
    url: "https://flk.npc.gov.cn/detail?id=1",
    title: "中华人民共和国治安管理处罚法_国家法律法规数据库",
    content: LAW_TEXT,
  });

  it("splits by article headings at line start", () => {
    expect(clauses.map((c) => c.article)).toEqual(["第四十二条", "第四十三条", "第四十四条", "第一百条之一"]);
  });

  it("keeps multi-paragraph article bodies together", () => {
    const art43 = clauses.find((c) => c.article === "第四十三条")!;
    expect(art43.text).toContain("殴打他人的");
    expect(art43.text).toContain("不满十四周岁的人");
    expect(art43.text).not.toContain("猥亵");
  });

  it("does not split on in-text references", () => {
    const art44 = clauses.find((c) => c.article === "第四十四条")!;
    expect(art44.text).toContain("依照本法第四十三条的规定从重处罚");
  });

  it("attaches law name and source to every clause", () => {
    for (const c of clauses) {
      expect(c.lawName).toBe("中华人民共和国治安管理处罚法");
      expect(c.sourceUrl).toBe("https://flk.npc.gov.cn/detail?id=1");
      expect(c.id).toBe(`${c.sourceUrl}#${c.article}`);
    }
  });

  it("falls back to passages when there are no article headings", () => {
    const passages = splitClauses({
      url: "https://www.court.gov.cn/news/1.html",
      title: "最高法发布校园欺凌典型案例 - 中华人民共和国最高人民法院",
      content: "段落一内容。\n".repeat(200),
    });
    expect(passages.length).toBeGreaterThan(1);
    expect(passages.every((p) => p.article === "")).toBe(true);
  });
});

describe("inferLawName", () => {
  it("prefers book-title brackets", () => {
    expect(inferLawName("依据《中华人民共和国民法典》第一千零二十四条的解读")).toBe("中华人民共和国民法典");
  });

  it("strips site suffixes from titles", () => {
    expect(inferLawName("中华人民共和国劳动合同法_中国人大网")).toBe("中华人民共和国劳动合同法");
  });

  it("prefers the page title over related laws linked in the body", () => {
    const body = "相关链接：关于修改《中华人民共和国治安管理处罚法》的决定\n第一条 ……";
    expect(inferLawName("中华人民共和国治安管理处罚法_中国人大网", body)).toBe("中华人民共和国治安管理处罚法");
  });

  it("falls back to bracketed names in the body", () => {
    expect(inferLawName("典型案例发布_最高人民法院", "依据《中华人民共和国民法典》第一千零二十四条")).toBe(
      "中华人民共和国民法典",
    );
  });
});

describe("rankClauses", () => {
  const clauses = splitClauses({ url: "u", title: "中华人民共和国治安管理处罚法", content: LAW_TEXT });

  it("ranks keyword matches first and drops irrelevant clauses", () => {
    const ranked = rankClauses(clauses, { keywords: ["殴打", "拘留"], candidateLaws: ["治安管理处罚法"] });
    expect(ranked[0].article).toBe("第四十三条");
    expect(ranked.find((c) => c.article === "第一百条之一")).toBeUndefined();
  });

  it("respects the character budget", () => {
    const ranked = rankClauses(clauses, { keywords: ["拘留"], candidateLaws: [] }, 80);
    expect(ranked.reduce((n, c) => n + c.text.length, 0)).toBeLessThanOrEqual(80);
  });
});
