import { z } from "zod";

import { AuthServiceError, registerWithPassword } from "@/lib/auth-service";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/security/passwords";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(254),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "入力内容を確認してください。" }, { status: 400 });
  try {
    await registerWithPassword(parsed.data, request.headers);
    return Response.json({ message: "確認メールを送信しました。" }, { status: 202 });
  } catch (error) {
    const status = error instanceof AuthServiceError ? error.status : 503;
    return Response.json({ error: status === 429 ? "時間を置いてお試しください。" : "登録を完了できませんでした。" }, { status });
  }
}
