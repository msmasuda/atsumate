import { z } from "zod";

import {
  AuthServiceError,
  authenticateGoogleIdToken,
  authenticatePassword,
  issueMobileTokens,
  revokeMobileTokens,
} from "@/lib/auth-service";
import { PASSWORD_MAX_LENGTH } from "@/lib/security/passwords";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("grantType", [
  z.object({
    grantType: z.literal("password"),
    email: z.email().max(254),
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  }),
  z.object({ grantType: z.literal("googleIdToken"), idToken: z.string().min(1) }),
]);

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "入力内容を確認してください。" }, { status: 400 });
  try {
    const user = parsed.data.grantType === "password"
      ? await authenticatePassword(parsed.data.email, parsed.data.password, request.headers)
      : await authenticateGoogleIdToken(parsed.data.idToken, request.headers);
    if (!user) return Response.json({ error: "認証情報が正しくありません。" }, { status: 401 });
    return Response.json(await issueMobileTokens(user.id));
  } catch (error) {
    const status = error instanceof AuthServiceError ? error.status : 503;
    return Response.json({ error: status === 429 ? "時間を置いてお試しください。" : "ログインを完了できませんでした。" }, { status });
  }
}

export async function DELETE(request: Request) {
  const parsed = z.object({ refreshToken: z.string().min(1) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "入力内容を確認してください。" }, { status: 400 });
  await revokeMobileTokens(parsed.data.refreshToken);
  return new Response(null, { status: 204 });
}
