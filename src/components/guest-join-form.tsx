"use client";

import { CheckCircle2, LoaderCircle, UserPlus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type ParticipantSummary = { id: string; name: string; attendance: string };

type GuestJoinFormProps = {
  inviteToken: string;
  initialParticipant: ParticipantSummary | null;
};

export function GuestJoinForm({ inviteToken, initialParticipant }: GuestJoinFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [participant, setParticipant] = useState(initialParticipant);
  const submittingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/invitations/${inviteToken}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email") || undefined }),
      });
      const body = (await response.json()) as { data?: ParticipantSummary; error?: string };
      if (!response.ok || !body.data) {
        setMessage(body.error ?? "登録できませんでした。");
        return;
      }
      setParticipant(body.data);
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (participant) {
    return (
      <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status" aria-live="polite">
        <CheckCircle2 className="size-8 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-black">参加登録が完了しました</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {participant.name}さんとして登録しました。この端末の参加情報を保存しています。
        </p>
        <p className="mt-3 text-sm font-semibold text-emerald-800">この画面は閉じて大丈夫です。</p>
      </div>
    );
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
        {isSubmitting ? "登録しています…" : "参加登録する"}
      </Button>
    </form>
  );
}
