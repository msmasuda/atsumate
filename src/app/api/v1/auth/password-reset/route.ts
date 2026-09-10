import { z } from "zod";

import { AuthServiceError, requestPasswordReset, resetPassword } from "@/lib/auth-service";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/security/passwords";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const email = z.email().max(254).safeParse((await request.json().catch(() => null))?.email);
  if (!email.success) return Response.json({ error: "入力内容を確認してください。" }, { status: 400 });
  try {
    await requestPasswordReset(email.data, request.headers);
    return Response.json({ message: "登録済みの場合は再設定メールを送信しました。" }, { status: 202 });
  } catch (error) {
    const status = error instanceof AuthServiceError ? error.status : 503;
    return Response.json({ error: "時間を置いてお試しください。" }, { status });
  }
}

export async function PATCH(request: Request) {
  const parsed = z.object({
    token: z.string().min(1),
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "入力内容を確認してください。" }, { status: 400 });
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return new Response(null, { status: 204 });
  } catch (error) {
    const status = error instanceof AuthServiceError ? error.status : 400;
    return Response.json({ error: "再設定URLが無効または期限切れです。" }, { status });
  }
}
