import { describe, expect, it } from "vitest";
import { classifyLawDoc } from "./law-doc";

const LAW_BODY = `中华人民共和国治安管理处罚法
第一章 总则
第一条 为了维护社会治安秩序，保障公共安全，制定本法。
第二条 违反治安管理的行为，依照本法给予处罚。
第三条 治安管理处罚的程序，适用本法的规定。
第五十一条 殴打他人的，或者故意伤害他人身体的，处五日以上十日以下拘留。`;

const doc = (title: string, content = LAW_BODY) => ({ url: "http://www.npc.gov.cn/x.html", title, content });

describe("classifyLawDoc", () => {
  it.each([
    "中华人民共和国治安管理处罚法_中国人大网",
    "中华人民共和国律师法_中国政府网",
    "最高人民法院关于审理人身损害赔偿案件适用法律若干问题的解释",
    "工资支付暂行规定",
    "中华人民共和国未成年人保护法（2024年修正）_国家法律法规数据库",
  ])("accepts the law text %s", (title) => {
    expect(classifyLawDoc(doc(title)).ok).toBe(true);
  });

  it.each([
    "新修订的治安管理处罚法自明年元旦起施行_中国人大网",
    "治安管理处罚法修订解读_司法部",
    "法律公开课：治安管理处罚法第五十一条讲解",
    "被同学打了怎么办？治安管理处罚法这样规定",
    "最高法发布校园欺凌典型案例",
    "全国人大常委会法工委答记者问",
    "中华人民共和国治安管理处罚法（修订草案）",
  ])("rejects second-hand material %s", (title) => {
    expect(classifyLawDoc(doc(title)).ok).toBe(false);
  });

  it("rejects pages without the articles from 第一条 onward", () => {
    const excerpt = "有关规定如下：\n第五十一条 殴打他人的，处五日以上十日以下拘留。\n第五十二条 猥亵他人的……\n第五十三条 ……";
    expect(classifyLawDoc(doc("中华人民共和国治安管理处罚法", excerpt)).ok).toBe(false);
    expect(classifyLawDoc(doc("中华人民共和国治安管理处罚法", "第一条 仅一条。")).ok).toBe(false);
  });

  it("rejects titles that are not law names", () => {
    expect(classifyLawDoc(doc("中国人大网首页")).ok).toBe(false);
  });
});
