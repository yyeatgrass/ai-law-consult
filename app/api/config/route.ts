import { connection } from "next/server";

export async function GET() {
  // Env vars must be read at request time, not baked in at build time.
  await connection();
  return Response.json({
    serverKeys: {
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      tavily: Boolean(process.env.TAVILY_API_KEY),
    },
  });
}
