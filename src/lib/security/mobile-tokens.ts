import { createHash, randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { createOpaqueToken } from "./tokens";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getSecret() {
  const value = process.env.MOBILE_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new Error("MOBILE_TOKEN_SECRETは32文字以上で設定してください。");
  }
  return new TextEncoder().encode(value);
}

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken() {
  return createOpaqueToken();
}

export async function createAccessToken(userId: string, authVersion: number) {
  return new SignJWT({ type: "access", authVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("atsumate")
    .setAudience("atsumate-api")
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "atsumate",
      audience: "atsumate-api",
      algorithms: ["HS256"],
    });
    return payload.type === "access" && payload.sub && typeof payload.authVersion === "number"
      ? { userId: payload.sub, authVersion: payload.authVersion }
      : null;
  } catch {
    return null;
  }
}
