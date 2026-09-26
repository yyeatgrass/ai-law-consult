import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LIBRARY_DIR, listLaws } from "@/lib/law-library";
import { lawDownloadHref, lawViewerHref } from "@/lib/law-links";

export const metadata: Metadata = { title: "已下载的法律 · 法律小帮手" };

export default async function LawsPage() {
  await connection();
  const laws = await listLaws();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <Link href="/" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> 返回咨询
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">已下载的法律</h1>
        <p className="text-sm text-muted-foreground">
          每次咨询检索到的官方页面都会自动保存到本机：<code className="rounded bg-muted px-1 text-xs">{LIBRARY_DIR}</code>
        </p>
      </header>

      {laws.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有保存任何法律。完成一次咨询后，检索到的官方原文会出现在这里。</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-foreground/10">
          {laws.map((law) => (
            <li key={law.id} className="flex flex-wrap items-center gap-3 p-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={lawViewerHref(law.id)} className="truncate font-medium hover:underline">
                  {law.lawName}
                </Link>
                <span className="truncate text-xs text-muted-foreground">
                  {new URL(law.url).hostname} · {law.length.toLocaleString()} 字 ·{" "}
                  {new Date(law.savedAt).toLocaleString("zh-CN")}
                </span>
              </div>
              {law.fromSnippet && <Badge variant="outline">仅摘要</Badge>}
              <a href={lawDownloadHref(law.id)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <Download /> 下载
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
