import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseClient } from "@/lib/supabase/server";

import { getAuthenticatedUser } from "./auth";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseClient: vi.fn() }));

describe("getAuthenticatedUser", () => {
  const getClaims = vi.fn();

  beforeEach(() => {
    vi.mocked(createSupabaseClient).mockResolvedValue({ auth: { getClaims } } as never);
    getClaims.mockReset();
  });

  it("Bearer JWTの検証済みclaimsから利用者を返す", async () => {
    getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "supabase-user-id",
          aud: "authenticated",
          role: "authenticated",
          email: "user@example.com",
          user_metadata: { full_name: "集 太郎" },
        },
      },
      error: null,
    });

    const request = new Request("http://localhost/api/v1/events", {
      headers: { Authorization: "Bearer access-token" },
    });

    await expect(getAuthenticatedUser(request)).resolves.toEqual({
      id: "supabase-user-id",
      name: "集 太郎",
      email: "user@example.com",
    });
    expect(getClaims).toHaveBeenCalledWith("access-token");
  });

  it("JWTを検証できない場合は未認証として扱う", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid token") });
    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });
});
