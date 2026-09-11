"use client";

import { CalendarCheck, CalendarPlus, LoaderCircle, Sparkles, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { summarizeDateVotes, type DateVoteStatus } from "@/lib/date-votes";

type Participant = { id: string; name: string; isKeyPerson: boolean };
type DateOption = {
  id: string;
  startAt: string;
  endAt: string | null;
  isDecided: boolean;
  votes: Array<{
    participantId: string;
    status: DateVoteStatus;
    conditionNote: string | null;
    participant: Participant;
  }>;
};
type DateSuggestion = { startAt: string; endAt?: string; reason: string };

type DateOptionManagerProps = {
  eventId: string;
  eventStatus: string;
  timeZone: string;
  participants: Participant[];
  options: DateOption[];
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

const voteLabels: Record<DateVoteStatus, string> = {
  ATTENDING: "○",
  CONDITIONAL: "△",
  DECLINED: "×",
};

export function DateOptionManager({
  eventId,
  eventStatus,
  timeZone,
  participants,
  options,
}: DateOptionManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DateSuggestion[]>([]);
  const planning = eventStatus === "PLANNING";

  async function request(method: "POST" | "PATCH" | "DELETE", body: object, pendingKey: string) {
    setPending(pendingKey);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/date-options`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "操作を完了できませんでした。");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
      return false;
    } finally {
      setPending(null);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const startAt = String(form.get("startAt"));
    const endAt = String(form.get("endAt") ?? "");
    const created = await request(
      "POST",
      {
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      },
      "create",
    );
    if (created) formElement.reset();
  }

  async function handleSuggest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending("suggest");
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/date-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: form.get("dateRequest") }),
      });
      const result = (await response.json()) as { data?: DateSuggestion[]; error?: string };
      if (!response.ok || !result.data) {
        setMessage(result.error ?? "AIから日程候補を取得できませんでした。");
        return;
      }
      setSuggestions(result.data);
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function handleAddSuggestion(suggestion: DateSuggestion) {
    const created = await request(
      "POST",
      { startAt: suggestion.startAt, endAt: suggestion.endAt },
      `suggestion-${suggestion.startAt}`,
    );
    if (created) setSuggestions((current) => current.filter((item) => item.startAt !== suggestion.startAt));
  }

  async function handleDelete(optionId: string) {
    if (!window.confirm("この候補日と参加者の回答を削除しますか？")) return;
    await request("DELETE", { optionId }, `delete-${optionId}`);
  }

  async function handleDecide(optionId: string) {
    if (!window.confirm("この候補日を開催日時として確定しますか？")) return;
    await request("PATCH", { optionId }, `decide-${optionId}`);
  }

  return (
    <div className="space-y-5">
      {planning ? (
        <div className="space-y-4">
          <form onSubmit={handleSuggest} className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <label htmlFor="dateRequest" className="flex items-center gap-2 text-sm font-black text-indigo-900">
              <Sparkles className="size-4" aria-hidden="true" /> AIに候補日を提案してもらう
            </label>
            <p className="mt-1 text-xs text-indigo-700">提案には30秒以上かかる場合があります。</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input id="dateRequest" name="dateRequest" required maxLength={500} className="min-h-11 min-w-0 flex-1 rounded-xl border border-indigo-200 bg-white px-3" placeholder="例：来月の金曜か土曜、19時から2時間" />
              <Button type="submit" disabled={pending !== null}>
                {pending === "suggest" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                {pending === "suggest" ? "提案中…" : "AIに提案を依頼"}
              </Button>
            </div>
          </form>

          {suggestions.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-indigo-200 p-4">
              <h3 className="font-black">AIからの提案</h3>
              {suggestions.map((suggestion) => (
                <div key={suggestion.startAt} className="flex flex-col justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold">{formatDateTime(suggestion.startAt, timeZone)}</p>
                    {suggestion.endAt ? <p className="text-xs text-slate-500">終了 {formatDateTime(suggestion.endAt, timeZone)}</p> : null}
                    <p className="mt-1 text-sm text-slate-600">{suggestion.reason}</p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" disabled={pending !== null} onClick={() => void handleAddSuggestion(suggestion)}>
                    {pending === `suggestion-${suggestion.startAt}` ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="size-4" aria-hidden="true" />}
                    候補日に追加
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startAt" className="block text-sm font-bold">開始日時</label>
              <input id="startAt" name="startAt" type="datetime-local" required className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" />
            </div>
            <div>
              <label htmlFor="endAt" className="block text-sm font-bold">終了日時 <span className="font-normal text-slate-400">（任意）</span></label>
              <input id="endAt" name="endAt" type="datetime-local" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending !== null}>
                {pending === "create" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="size-4" aria-hidden="true" />}
                候補日を追加
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {message ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{message}</p> : null}

      {options.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
          候補日はまだありません。
        </p>
      ) : (
        <div className="space-y-3">
          {options.map((option) => {
            const summary = summarizeDateVotes(option.votes, participants.length);
            const unanswered = participants.filter(
              (participant) => !option.votes.some((vote) => vote.participantId === participant.id),
            );
            return (
              <article key={option.id} className={`rounded-2xl border p-5 ${option.isDecided ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black">{formatDateTime(option.startAt, timeZone)}</h3>
                      {option.isDecided ? <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">決定</span> : null}
                    </div>
                    {option.endAt ? <p className="mt-1 text-sm text-slate-500">終了 {formatDateTime(option.endAt, timeZone)}</p> : null}
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      ○ {summary.attending}名　△ {summary.conditional}名　× {summary.declined}名　未回答 {summary.unanswered}名
                    </p>
                  </div>
                  {planning ? (
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" size="sm" onClick={() => void handleDecide(option.id)} disabled={pending !== null}>
                        {pending === `decide-${option.id}` ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarCheck className="size-4" aria-hidden="true" />}
                        この日に決定
                      </Button>
                      <Button type="button" size="sm" variant="secondary" aria-label="候補日を削除" onClick={() => void handleDelete(option.id)} disabled={pending !== null}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {option.votes.length > 0 || unanswered.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {option.votes.map((vote) => (
                      <span key={vote.participantId} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                        {vote.participant.isKeyPerson ? <Star className="size-3 fill-amber-400 text-amber-400" aria-label="キーパーソン" /> : null}
                        {vote.participant.name} {voteLabels[vote.status]}
                        {vote.conditionNote ? `（${vote.conditionNote}）` : ""}
                      </span>
                    ))}
                    {unanswered.map((participant) => (
                      <span key={participant.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-400">
                        {participant.isKeyPerson ? <Star className="size-3 fill-amber-400 text-amber-400" aria-label="キーパーソン" /> : null}
                        {participant.name} 未回答
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
