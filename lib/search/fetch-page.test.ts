import { describe, expect, it } from "vitest";
import { splitClauses } from "./clauses";
import { decodeHtml, htmlToText } from "./fetch-page";
import { isOfficialUrl } from "./official-domains";

// Structure mirrors www.npc.gov.cn law pages: article numbers wrapped in <font> at paragraph start.
const NPC_HTML = `<html><head><title>中华人民共和国治安管理处罚法_中国人大网</title>
<style>p { color: red }</style><script>var 第一条 = 1;</script></head><body>
<div class="nav">首页 &gt; 法律</div>
<p style="text-indent:2em"><font face="黑体">第五十一条&nbsp;&nbsp;</font>殴打他人的，或者故意伤害他人身体的，处五日以上十日以下拘留。</p>
<p>有下列情形之一的，处十日以上十五日以下拘留：<br/>（一）结伙殴打、伤害他人的；</p>
<p><font>第五十二条　</font>猥亵他人的，依照本法第五十一条的规定处罚。</p>
<!-- 第九十九条 注释 -->
</body></html>`;

describe("htmlToText", () => {
  const text = htmlToText(NPC_HTML);

  it("drops scripts, styles, head and comments", () => {
    expect(text).not.toContain("color: red");
    expect(text).not.toContain("var 第一条");
    expect(text).not.toContain("第九十九条");
  });

  it("decodes entities and keeps paragraph breaks", () => {
    expect(text).toContain("首页 > 法律");
    expect(text).toContain("（一）结伙殴打、伤害他人的；");
    expect(text.split("\n")).toContain("第五十一条 殴打他人的，或者故意伤害他人身体的，处五日以上十日以下拘留。");
  });

  it("produces text the clause splitter can parse", () => {
    const clauses = splitClauses({ url: "http://www.npc.gov.cn/x.html", title: "中华人民共和国治安管理处罚法_中国人大网", content: text });
    expect(clauses.map((c) => c.article)).toEqual(["第五十一条", "第五十二条"]);
    expect(clauses[0].text).toContain("结伙殴打");
  });
});

describe("decodeHtml", () => {
  it("honours a GBK meta charset", () => {
    const head = new TextEncoder().encode('<meta charset="gbk"><p>');
    const body = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3]); // 你好 in GBK
    expect(decodeHtml(new Uint8Array([...head, ...body]))).toContain("你好");
  });

  it("prefers the Content-Type header charset", () => {
    const bytes = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3]);
    expect(decodeHtml(bytes, "text/html; charset=GB2312")).toBe("你好");
  });

  it("defaults to UTF-8", () => {
    expect(decodeHtml(new TextEncoder().encode("第一条"))).toBe("第一条");
  });
});

describe("isOfficialUrl", () => {
  it.each([
    ["http://www.npc.gov.cn/npc/c2/x.html", true],
    ["https://flk.npc.gov.cn/detail", true],
    ["https://www.court.gov.cn/a", true],
    ["https://www.chinacourt.org/article", false],
    ["https://fakegov.cn/a", false],
    ["https://gov.cn.evil.com/a", false],
    ["https://zhihu.com/q", false],
    ["file:///etc/passwd", false],
    ["not a url", false],
  ])("%s -> %s", (url, expected) => {
    expect(isOfficialUrl(url)).toBe(expected);
  });
});
