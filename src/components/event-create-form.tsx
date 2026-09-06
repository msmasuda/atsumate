"use client";

import { CalendarPlus, CheckCircle2, Copy, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CreateResult = { data: { id: string; title: string }; inviteUrl: string };

export function EventCreateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description") || undefined,
        }),
      });
      const body = (await response.json()) as CreateResult | { error?: string };
      if (!response.ok || !("inviteUrl" in body)) {
        setError("error" in body && body.error ? body.error : "イベントを作成できませんでした。");
        return;
      }
      setResult(body);
    } catch {
      setError("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    const absoluteInviteUrl = `${window.location.origin}${result.inviteUrl}`;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status">
        <CheckCircle2 className="size-8 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-black">「{result.data.title}」を作成しました</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">このURLを参加者へ共有してください。</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className="min-h-11 min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 text-sm" value={absoluteInviteUrl} readOnly aria-label="参加者用招待URL" />
          <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(absoluteInviteUrl)}>
            <Copy className="size-4" aria-hidden="true" /> URLをコピー
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-bold">集まりの名前</label>
        <input id="title" name="title" required maxLength={120} autoFocus placeholder="例：プロジェクト打ち上げ" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-bold">メモ <span className="font-normal text-slate-400">（任意）</span></label>
        <textarea id="description" name="description" maxLength={2000} rows={5} placeholder="場所や目的など、決まっていることを書いてください" className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      </div>
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="size-4" aria-hidden="true" />}
        {isSubmitting ? "作成しています…" : "集まりを作成"}
      </Button>
    </form>
  );
}
