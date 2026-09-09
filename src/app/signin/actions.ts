"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseClient } from "@/lib/supabase/server";

const callbackUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/auth/callback`;

export async function signInWithGoogle() {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) redirect("/signin?error=oauth");
  redirect(data.url);
}

export async function signInWithPassword(formData: FormData) {
  const parsed = z.object({
    email: z.email(),
    password: z.string().min(1),
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/signin?error=password");

  const supabase = await createSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/signin?error=password");
  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const parsed = z.object({
    email: z.email(),
    password: z.string().min(1),
    passwordConfirmation: z.string(),
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) redirect("/signup?error=input");
  if (parsed.data.password !== parsed.data.passwordConfirmation) {
    redirect("/signup?error=confirmation");
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: callbackUrl },
  });

  if (error) redirect("/signup?error=signup");
  redirect(data.session ? "/" : "/signin?registered=1");
}

export async function sendMagicLink(formData: FormData) {
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) redirect("/signin?error=email");

  const supabase = await createSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: callbackUrl },
  });

  if (error) redirect("/signin?error=email");
  redirect("/signin?sent=1");
}
