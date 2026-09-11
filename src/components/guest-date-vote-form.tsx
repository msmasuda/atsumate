"use client";

import { CalendarCheck, CheckCircle2, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GuestEventManager } from "@/components/guest-event-manager";
import type { DateVoteStatus } from "@/lib/date-votes";

type DateOption = {
  id: string;
  startAt: string;
  endAt: string | null;
  isDecided: boolean;
};
type Vote = { optionId: string; status: DateVoteStatus; conditionNote: string | null };
type Expense = { id: string; title: string; amount: number; status: string; rejectionReason: string | null };
type Settlement = { id: string; amount: number; status: string; participantName: string };

type GuestDateVoteFormProps = {
  inviteToken: string;
  participantName: string;
  eventStatus: string;
  timeZone: string;
  options: DateOption[];
  initialVotes: Vote[];
  initialAttendance: string;
  expenses: Expense[];
  settlementsToPay: Settlement[];
  settlementsToReceive: Settlement[];
};

function formatDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone,
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const choices = [
  { value: "ATTENDING", label: "○ 参加できる" },
  { value: "CONDITIONAL", label: "△ 条件つき" },
  { value: "DECLINED", label: "× 参加できない" },
] as const;

export function GuestDateVoteForm({
  inviteToken,
  participantName,
  eventStatus,
  timeZone,
  options,
  initialVotes,
  initialAttendance,
  expenses,
  settlementsToPay,
  settlementsToReceive,
}: GuestDateVoteFormProps) {
  const [statuses, setStatuses] = useState<Record<string, DateVoteStatus>>(() =>
    Object.fromEntries(initialVotes.map((vote) => [vote.optionId, vote.status])),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVotes, setHasVotes] = useState(initialVotes.length > 0);
  const [message, setMessage] = useState<string | null>(null);
  const decided = options.find((option) => option.isDecided);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/invitations/${inviteToken}/date-votes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          votes: options.map((option) => ({
            optionId: option.id,
            status: form.get(`vote-${option.id}`),
            conditionNote: form.get(`note-${option.id}`) || undefined,
          })),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "回答を保存できませんでした。");
        return;
      }
      setHasVotes(true);
      setMessage("回答を保存しました。後からこのURLで変更できます。");
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-7">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {participantName}さんとして参加登録済みです
        </p>
      </div>

      {eventStatus !== "PLANNING" ? (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="flex items-center gap-2 font-black text-indigo-900">
            <CalendarCheck className="size-5" aria-hidden="true" /> 開催日時が決まりました
          </p>
          <p className="mt-2 text-lg font-black">{decided ? formatDateTime(decided.startAt, timeZone) : "幹事からの案内をお待ちください"}</p>
        </div>
      ) : options.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-100 p-5 text-sm font-semibold text-slate-600">
          候補日はまだ登録されていません。幹事からの案内をお待ちください。
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <h2 className="text-xl font-black">参加できる日を回答</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">各候補日に○・△・×を選んでください。</p>
          </div>
          {options.map((option) => {
            const initialVote = initialVotes.find((vote) => vote.optionId === option.id);
            return (
              <fieldset key={option.id} className="rounded-2xl border border-slate-200 p-4">
                <legend className="px-1 font-black">{formatDateTime(option.startAt, timeZone)}</legend>
                {option.endAt ? <p className="mb-3 text-xs text-slate-500">終了 {formatDateTime(option.endAt, timeZone)}</p> : null}
                <div className="grid gap-2 sm:grid-cols-3">
                  {choices.map((choice) => (
                    <label key={choice.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold has-checked:border-indigo-500 has-checked:bg-indigo-50 has-checked:text-indigo-700">
                      <input
                        type="radio"
                        name={`vote-${option.id}`}
                        value={choice.value}
                        required
                        defaultChecked={initialVote?.status === choice.value}
                        onChange={() => setStatuses((current) => ({ ...current, [option.id]: choice.value }))}
                      />
                      {choice.label}
                    </label>
                  ))}
                </div>
                {statuses[option.id] === "CONDITIONAL" ? (
                  <input
                    name={`note-${option.id}`}
                    maxLength={120}
                    defaultValue={initialVote?.conditionNote ?? ""}
                    className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                    placeholder="例：19時以降なら参加できます"
                    aria-label={`${formatDateTime(option.startAt, timeZone)}の参加条件`}
                  />
                ) : null}
              </fieldset>
            );
          })}
          {message ? <p className={`rounded-xl p-3 text-sm font-semibold ${message.startsWith("回答を保存") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`} role="status">{message}</p> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarCheck className="size-4" aria-hidden="true" />}
            {isSubmitting ? "保存しています…" : hasVotes ? "回答を更新" : "回答を送信"}
          </Button>
        </form>
      )}
      {eventStatus !== "PLANNING" ? (
        <GuestEventManager
          inviteToken={inviteToken}
          eventStatus={eventStatus}
          initialAttendance={initialAttendance}
          expenses={expenses}
          settlementsToPay={settlementsToPay}
          settlementsToReceive={settlementsToReceive}
        />
      ) : null}
    </div>
  );
}
