import { splitClauses, type SourceDoc } from "./clauses";

const MIN_ARTICLES = 3;

/** Names of primary legal texts: laws, codes, regulations, rules and judicial interpretations. */
const LAW_NAME_SUFFIX = /(法|法典|条例|规定|办法|规则|细则|解释|决定|批复)$/;

/** Titles marking commentary, news, teaching or other second-hand material. */
const SECONDARY_MARKERS =
  /解读|释义|答记者问|问答|答问|案例|典型|公开课|讲座|课堂|讲堂|讲解|新闻|报道|综述|评论|评析|专家|学者|宣传|普法|说法|学习|图解|读懂|一图|视频|发布会|热点|如何|怎么|怎样|是否|吗|？|\?|草案|征求意见/;

export type LawDocVerdict = { ok: true; lawName: string } | { ok: false; reason: string };

/**
 * Accepts only pages that contain the text of a law itself (from 第一条 onward),
 * rejecting news, commentary, Q&A, cases, courses and drafts even on official sites.
 */
export function classifyLawDoc(doc: SourceDoc): LawDocVerdict {
  // The whole title (minus site suffix and a trailing "（2025年修订）") must be the law's name;
  // headlines that merely mention a law, e.g. "新修订的治安管理处罚法自明年元旦起施行", are rejected.
  const titleHead = doc.title
    .split(/[_|｜]/)[0]
    .replace(/[（(][^）)]*[）)]\s*$/, "")
    .replace(/[《》\s]/g, "");
  if (SECONDARY_MARKERS.test(doc.title.split(/[_|｜]/)[0])) {
    return { ok: false, reason: "标题显示为解读、新闻、问答或草案等二手资料" };
  }
  if (!LAW_NAME_SUFFIX.test(titleHead)) return { ok: false, reason: "标题不是法律法规名称" };
  const lawName = titleHead;

  const articles = splitClauses(doc).filter((c) => c.article);
  if (articles.length < MIN_ARTICLES || !articles.some((c) => c.article === "第一条")) {
    return { ok: false, reason: "页面不包含完整的法律条文" };
  }
  return { ok: true, lawName };
}
