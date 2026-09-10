import { describe, expect, it } from "vitest";

import { hashPassword, isPasswordAllowed, verifyPassword } from "./passwords";

describe("passwords", () => {
  it("許可した長さのパスワードだけをハッシュ化して照合する", async () => {
    const password = "correct horse battery staple";
    expect(isPasswordAllowed(password)).toBe(true);
    expect(isPasswordAllowed("too-short")).toBe(false);

    const hash = await hashPassword(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password value", hash)).resolves.toBe(false);
  });
});
