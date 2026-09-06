import { createHmac, randomBytes } from "node:crypto";

export function createOpaqueToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function hashGuestToken(token: string) {
  const pepper = process.env.GUEST_TOKEN_PEPPER;
  if (!pepper) throw new Error("GUEST_TOKEN_PEPPERが設定されていません。");
  return createHmac("sha256", pepper).update(token).digest("hex");
}
