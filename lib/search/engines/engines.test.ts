import { afterEach, describe, expect, it, vi } from "vitest";
import { searchBocha } from "./bocha";
import { searchZhipu } from "./zhipu";

function mockFetch(handler: (url: string, body: Record<string, unknown>) => { status?: number; json: unknown }) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status = 200, json } = handler(url, JSON.parse(String(init?.body ?? "{}")));
    return new Response(JSON.stringify(json), { status });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("searchBocha", () => {
  it("sends the domain allowlist and parses webPages", async () => {
    const fetchMock = mockFetch(() => ({
      json: {
        code: 200,
        data: {
          webPages: {
            value: [
              { name: "治安管理处罚法", url: "http://www.npc.gov.cn/a.html", summary: "第五十一条 殴打他人的……" },
              { name: "无链接" },
            ],
          },
        },
      },
    }));

    const hits = await searchBocha("殴打 处罚", "sk-test", ["npc.gov.cn", "court.gov.cn"]);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({ query: "殴打 处罚", include: "npc.gov.cn|court.gov.cn" });
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(hits).toEqual([
      { url: "http://www.npc.gov.cn/a.html", title: "治安管理处罚法", score: 1 },
    ]);
  });

  it("throws on API errors", async () => {
    mockFetch(() => ({ status: 401, json: { log_id: "x", code: "401", message: "Invalid API KEY" } }));
    await expect(searchBocha("q", "bad", [])).rejects.toThrow("401 Invalid API KEY");
  });

  it("accepts a string success code", async () => {
    mockFetch(() => ({ json: { code: "200", data: { webPages: { value: [] } } } }));
    await expect(searchBocha("q", "k", [])).resolves.toEqual([]);
  });

  it("throws when the body reports a non-200 code", async () => {
    mockFetch(() => ({ json: { code: 403, msg: "余额不足" } }));
    await expect(searchBocha("q", "k", [])).rejects.toThrow("余额不足");
  });
});

describe("searchZhipu", () => {
  it("runs one NPC-filtered and one open search, truncating long queries", async () => {
    const fetchMock = mockFetch((_url, body) => ({
      json: {
        search_result: [
          { title: body.search_domain_filter ? "人大网" : "其他", link: `https://x/${body.search_domain_filter ?? "open"}`, content: "摘要" },
        ],
      },
    }));

    const hits = await searchZhipu("很长".repeat(50), "key", []);

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies.map((b) => b.search_domain_filter)).toEqual(["www.npc.gov.cn", undefined]);
    expect(bodies.every((b) => b.search_query.length <= 70)).toBe(true);
    expect(hits.map((h) => h.title)).toEqual(["人大网", "其他"]);
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  it("throws on API errors", async () => {
    mockFetch(() => ({ status: 401, json: { error: { code: "1000", message: "身份验证失败" } } }));
    await expect(searchZhipu("q", "bad", [])).rejects.toThrow("401 身份验证失败");
  });
});
