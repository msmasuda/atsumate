import { z } from "zod";

import { AuthServiceError, refreshMobileTokens } from "@/lib/auth-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = z.object({ refreshToken: z.string().min(1) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "入力内容を確認してください。" }, { status: 400 });
  try {
    return Response.json(await refreshMobileTokens(parsed.data.refreshToken));
  } catch (error) {
    const status = error instanceof AuthServiceError ? error.status : 401;
    return Response.json({ error: "更新トークンが無効または期限切れです。" }, { status });
  }
}
