import { createHmac, randomUUID } from "node:crypto";

import { createRemoteJWKSet, jwtVerify } from "jose";

import { AuthTokenPurpose } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { sendAuthEmail } from "@/lib/email";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  createAccessToken,
  createRefreshToken,
  hashAuthToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/security/mobile-tokens";
import { hashPassword, verifyPassword } from "@/lib/security/passwords";
import { createOpaqueToken } from "@/lib/security/tokens";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export class AuthServiceError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRETは32文字以上で設定してください。");
  return secret;
}

function rateLimitKey(scope: string, identity: string) {
  return createHmac("sha256", authSecret())
    .update(`${scope}\0${identity}`)
    .digest("hex");
}

async function consumeRateLimitKey(keyHash: string, limit: number, windowSeconds: number) {
  const cutoff = new Date(Date.now() - windowSeconds * 1000);
  const rows = await getPrisma().$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" ("keyHash", "attempts", "windowStartedAt", "updatedAt")
    VALUES (${keyHash}, 1, NOW(), NOW())
    ON CONFLICT ("keyHash") DO UPDATE SET
      "attempts" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${cutoff} THEN 1
        ELSE "AuthRateLimit"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${cutoff} THEN NOW()
        ELSE "AuthRateLimit"."windowStartedAt"
      END,
      "updatedAt" = NOW()
    RETURNING "attempts"
  `;
  if ((rows[0]?.attempts ?? limit + 1) > limit) {
    throw new AuthServiceError("RATE_LIMITED", 429);
  }
}

async function consumeRateLimit(
  scope: string,
  identity: string,
  headers: Headers | undefined,
  limit: number,
  windowSeconds: number,
) {
  const identityKey = rateLimitKey(scope, `identity:${identity}`);
  const forwarded = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers?.get("x-real-ip") || "local";
  await consumeRateLimitKey(rateLimitKey(scope, `ip:${ip}`), limit * 3, windowSeconds);
  await consumeRateLimitKey(identityKey, limit, windowSeconds);
  return identityKey;
}

async function createActionToken(
  userId: string,
  purpose: AuthTokenPurpose,
  value: string | null,
  ttlSeconds: number,
) {
  const token = createOpaqueToken();
  const db = getPrisma();
  await db.$transaction([
    db.authActionToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    db.authActionToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashAuthToken(token),
        value,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    }),
  ]);
  return token;
}

function siteUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function registerWithPassword(
  input: { name?: string; email: string; password: string },
  headers?: Headers,
) {
  const email = normalizeEmail(input.email);
  await consumeRateLimit("register", email, headers, 5, 60 * 60);
  const passwordHash = await hashPassword(input.password);
  const db = getPrisma();
  const existing = await db.user.findUnique({ where: { email } });

  if (existing?.passwordHash) return;

  const user = existing ?? await db.user.create({
    data: { email, name: input.name?.trim() || email.split("@")[0] },
  });
  const token = await createActionToken(
    user.id,
    AuthTokenPurpose.EMAIL_VERIFICATION,
    passwordHash,
    24 * 60 * 60,
  );
  await sendAuthEmail(
    email,
    "atsumate メールアドレスの確認",
    `次のURLを24時間以内に開いて登録を完了してください。\n${siteUrl()}/api/v1/auth/verify-email?token=${token}`,
  );
}

export async function verifyEmail(token: string) {
  const db = getPrisma();
  const record = await db.authActionToken.findUnique({
    where: { tokenHash: hashAuthToken(token) },
  });
  if (
    !record ||
    record.purpose !== AuthTokenPurpose.EMAIL_VERIFICATION ||
    record.usedAt ||
    record.expiresAt <= new Date() ||
    !record.value
  ) throw new AuthServiceError("INVALID_TOKEN");

  await db.$transaction(async (tx) => {
    const updated = await tx.authActionToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (updated.count !== 1) throw new AuthServiceError("INVALID_TOKEN");
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date(), passwordHash: record.value },
    });
  });
}

export async function requestPasswordReset(emailValue: string, headers?: Headers) {
  const email = normalizeEmail(emailValue);
  await consumeRateLimit("password-reset", email, headers, 5, 60 * 60);
  const user = await getPrisma().user.findUnique({ where: { email } });
  if (!user?.emailVerified || !user.email) return;

  const token = await createActionToken(
    user.id,
    AuthTokenPurpose.PASSWORD_RESET,
    null,
    60 * 60,
  );
  await sendAuthEmail(
    user.email,
    "atsumate パスワードの再設定",
    `次のURLを1時間以内に開いてパスワードを再設定してください。\n${siteUrl()}/reset-password?token=${token}`,
  );
}

export async function resetPassword(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  const db = getPrisma();
  const record = await db.authActionToken.findUnique({
    where: { tokenHash: hashAuthToken(token) },
  });
  if (
    !record ||
    record.purpose !== AuthTokenPurpose.PASSWORD_RESET ||
    record.usedAt ||
    record.expiresAt <= new Date()
  ) throw new AuthServiceError("INVALID_TOKEN");

  await db.$transaction(async (tx) => {
    const updated = await tx.authActionToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (updated.count !== 1) throw new AuthServiceError("INVALID_TOKEN");
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, authVersion: { increment: 1 } },
    });
    await tx.mobileSession.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}

export async function authenticatePassword(emailValue: string, password: string, headers?: Headers) {
  const email = normalizeEmail(emailValue);
  const rateKey = await consumeRateLimit("login", email, headers, 10, 15 * 60);
  const user = await getPrisma().user.findUnique({ where: { email } });
  if (!user?.passwordHash || !user.emailVerified || !(await verifyPassword(password, user.passwordHash))) {
    return null;
  }
  await getPrisma().authRateLimit.delete({ where: { keyHash: rateKey } }).catch(() => undefined);
  return user;
}

export async function authenticateGoogleIdToken(idToken: string, headers?: Headers) {
  await consumeRateLimit("google-login", hashAuthToken(idToken), headers, 20, 15 * 60);
  const audiences = [
    process.env.AUTH_GOOGLE_ID,
    ...String(process.env.GOOGLE_ALLOWED_CLIENT_IDS ?? "").split(","),
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (!audiences.length) throw new Error("Google OAuthのClient IDが設定されていません。");

  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: audiences,
      algorithms: ["RS256"],
    }));
  } catch {
    return null;
  }
  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) return null;

  const db = getPrisma();
  const account = await db.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: payload.sub } },
    include: { user: true },
  });
  if (account) return account.user;

  const email = normalizeEmail(payload.email);
  return db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        emailVerified: new Date(),
        name: typeof payload.name === "string" ? payload.name : undefined,
        image: typeof payload.picture === "string" ? payload.picture : undefined,
      },
      create: {
        email,
        emailVerified: new Date(),
        name: typeof payload.name === "string" ? payload.name : email.split("@")[0],
        image: typeof payload.picture === "string" ? payload.picture : null,
      },
    });
    await tx.account.create({
      data: {
        userId: user.id,
        type: "oidc",
        provider: "google",
        providerAccountId: payload.sub!,
      },
    });
    return user;
  });
}

export async function issueMobileTokens(userId: string, familyId = randomUUID()) {
  const user = await getPrisma().user.findUniqueOrThrow({
    where: { id: userId },
    select: { authVersion: true },
  });
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  await getPrisma().mobileSession.create({
    data: { userId, familyId, refreshTokenHash: hashAuthToken(refreshToken), expiresAt },
  });
  return {
    accessToken: await createAccessToken(userId, user.authVersion),
    tokenType: "Bearer" as const,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
  };
}

export async function refreshMobileTokens(refreshToken: string) {
  const db = getPrisma();
  const current = await db.mobileSession.findUnique({
    where: { refreshTokenHash: hashAuthToken(refreshToken) },
    include: { user: { select: { authVersion: true } } },
  });
  if (!current) throw new AuthServiceError("INVALID_REFRESH_TOKEN", 401);
  if (current.revokedAt || current.expiresAt <= new Date()) {
    await db.mobileSession.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AuthServiceError("INVALID_REFRESH_TOKEN", 401);
  }

  const nextToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  await db.$transaction(async (tx) => {
    const revoked = await tx.mobileSession.updateMany({
      where: { id: current.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new AuthServiceError("INVALID_REFRESH_TOKEN", 401);
    await tx.mobileSession.create({
      data: {
        userId: current.userId,
        familyId: current.familyId,
        refreshTokenHash: hashAuthToken(nextToken),
        expiresAt,
      },
    });
  });
  return {
    accessToken: await createAccessToken(current.userId, current.user.authVersion),
    tokenType: "Bearer" as const,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: nextToken,
  };
}

export async function revokeMobileTokens(refreshToken: string) {
  const current = await getPrisma().mobileSession.findUnique({
    where: { refreshTokenHash: hashAuthToken(refreshToken) },
  });
  if (!current) return;
  await getPrisma().mobileSession.updateMany({
    where: { familyId: current.familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
