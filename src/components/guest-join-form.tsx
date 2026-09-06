"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function GuestJoinForm({ inviteToken }: { inviteToken: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/invitations/${inviteToken}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email") || undefined }),
      });
      const body = (await response.json()) as { data?: { name: string }; error?: string };
      setMessage(response.ok ? `${body.data?.name ?? "参加者"}さんとして登録しました。` : body.error ?? "登録できませんでした。");
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-bold">表示名</label>
        <input id="name" name="name" required maxLength={80} autoComplete="name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="例：まさだ" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-bold">メールアドレス <span className="font-normal text-slate-400">（任意）</span></label>
        <input id="email" name="email" type="email" autoComplete="email" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="reminder@example.com" />
      </div>
      {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold" role="status">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        {isSubmitting ? "登録しています…" : "参加登録へ進む"}
      </Button>
    </form>
  );
}
