import { connection } from "next/server";
import { SEARCH_PROVIDER_IDS } from "@/lib/search/providers";
import { defaultSearchProvider, serverSearchKey } from "@/lib/server-keys";

export async function GET() {
  // Env vars must be read at request time, not baked in at build time.
  await connection();
  return Response.json({
    defaultSearchProvider: defaultSearchProvider(),
    serverKeys: {
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      search: Object.fromEntries(SEARCH_PROVIDER_IDS.map((id) => [id, Boolean(serverSearchKey(id))])),
    },
  });
}
