import { getLaw } from "@/lib/law-library";

export async function GET(_request: Request, ctx: RouteContext<"/api/laws/[id]/download">) {
  const { id } = await ctx.params;
  const law = await getLaw(id);
  if (!law) return Response.json({ error: "未找到该法律的本地副本" }, { status: 404 });

  const header = [
    law.lawName,
    `来源：${law.url}`,
    `保存时间：${new Date(law.savedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    "仅供参考，请以官方发布的版本为准。",
  ].filter(Boolean);
  const body = `${header.join("\n")}\n\n${"=".repeat(40)}\n\n${law.content}\n`;
  const filename = `${law.lawName.replace(/[\\/:*?"<>|]/g, "_")}.txt`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="law.txt"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
