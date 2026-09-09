import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseClient } from "@/lib/supabase/server";

import { signUpWithPassword } from "./actions";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseClient: vi.fn() }));

describe("signUpWithPassword", () => {
  const signUp = vi.fn();

  beforeEach(() => {
    vi.mocked(createSupabaseClient).mockResolvedValue({ auth: { signUp } } as never);
    signUp.mockReset();
    redirect.mockReset().mockImplementation((url: string) => {
      throw new Error(`redirect:${url}`);
    });
  });

  it("確認用パスワードが違う場合はSupabaseへ送信しない", async () => {
    const form = new FormData();
    form.set("email", "user@example.com");
    form.set("password", "password-1");
    form.set("passwordConfirmation", "password-2");

    await expect(signUpWithPassword(form)).rejects.toThrow(
      "redirect:/signup?error=confirmation",
    );
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });

  it("メール確認が必要な場合は案内付きログイン画面へ進む", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    const form = new FormData();
    form.set("email", "user@example.com");
    form.set("password", "password");
    form.set("passwordConfirmation", "password");

    await expect(signUpWithPassword(form)).rejects.toThrow(
      "redirect:/signin?registered=1",
    );
    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password",
      options: { emailRedirectTo: expect.stringContaining("/auth/callback") },
    });
  });
});
