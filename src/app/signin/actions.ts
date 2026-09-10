"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import {
  registerWithPassword,
  requestPasswordReset,
  resetPassword,
} from "@/lib/auth-service";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/security/passwords";

const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signInWithPassword(formData: FormData) {
  const parsed = z.object({
    email: z.email().max(254),
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  }).safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/signin?error=credentials");

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/signin?error=credentials");
    throw error;
  }
}

export async function signUpWithPassword(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(1).max(80),
    email: z.email().max(254),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  }).safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) redirect("/signup?error=input");
  if (parsed.data.password !== parsed.data.passwordConfirmation) {
    redirect("/signup?error=confirmation");
  }

  try {
    await registerWithPassword(parsed.data, await headers());
  } catch {
    redirect("/signup?error=signup");
  }
  redirect("/signin?registered=1");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = z.email().max(254).safeParse(formData.get("email"));
  if (!email.success) redirect("/forgot-password?error=input");
  try {
    await requestPasswordReset(email.data, await headers());
  } catch {
    redirect("/forgot-password?error=request");
  }
  redirect("/signin?resetRequested=1");
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = z.object({
    token: z.string().min(1),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  }).safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success || parsed.data.password !== parsed.data.passwordConfirmation) {
    redirect(`/reset-password?token=${encodeURIComponent(String(formData.get("token") ?? ""))}&error=input`);
  }
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch {
    redirect("/reset-password?error=token");
  }
  redirect("/signin?reset=1");
}
