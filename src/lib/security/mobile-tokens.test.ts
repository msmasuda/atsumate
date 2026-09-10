import { beforeEach, describe, expect, it } from "vitest";

import { createAccessToken, verifyAccessToken } from "./mobile-tokens";

describe("mobile-tokens", () => {
  beforeEach(() => {
    process.env.MOBILE_TOKEN_SECRET = "test-only-mobile-token-secret-32-characters";
  });

  it("発行したアクセストークンだけからユーザーIDを復元する", async () => {
    const token = await createAccessToken("user-1", 2);
    await expect(verifyAccessToken(token)).resolves.toEqual({ userId: "user-1", authVersion: 2 });
    await expect(verifyAccessToken(`${token}x`)).resolves.toBeNull();
  });
});
