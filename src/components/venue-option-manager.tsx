"use client";

import { Check, ExternalLink, LoaderCircle, Sparkles, Store, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Venue = {
  id: string;
  name: string;
  url: string | null;
  courseTitle: string | null;
  pricePerPerson: number | null;
  features: string | null;
  recommendation: string | null;
  isDecided: boolean;
  votes: Array<{ participantId: string; participant: { name: string } }>;
};
type VenueSuggestion = Omit<Venue, "id" | "isDecided" | "votes">;

type VenueOptionManagerProps = {
  eventId: string;
  eventStatus: string;
  venues: Venue[];
};

function yen(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export function VenueOptionManager({ eventId, eventStatus, venues }: VenueOptionManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const canManage = ["PLANNING", "CONFIRMED"].includes(eventStatus);

  async function request(method: "POST" | "PATCH" | "DELETE", body: object, pendingKey: string) {
    setPending(pendingKey);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/venue-options`, {
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

  async function handleSuggest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending("suggest");
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/venue-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: form.get("venueRequest") }),
      });
      const result = (await response.json()) as { data?: VenueSuggestion[]; error?: string };
      if (!response.ok || !result.data) {
        setMessage(result.error ?? "AIから店舗候補を取得できませんでした。");
        return;
      }
      setSuggestions(result.data);
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function handleAdd(suggestion: VenueSuggestion) {
    const created = await request("POST", suggestion, `add-${suggestion.name}`);
    if (created) setSuggestions((current) => current.filter((item) => item.name !== suggestion.name));
  }

  async function handleDecide(optionId: string) {
    if (!window.confirm("この店舗を開催場所として決定しますか？")) return;
    await request("PATCH", { optionId }, `decide-${optionId}`);
  }

  async function handleDelete(optionId: string) {
    if (!window.confirm("この店舗候補と参加者の投票を削除しますか？")) return;
    await request("DELETE", { optionId }, `delete-${optionId}`);
  }

  function VenueDetails({ venue }: { venue: VenueSuggestion }) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-black">{venue.name}</h3>
          {venue.url ? (
            <a href={venue.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
              店舗ページ <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        {venue.courseTitle || venue.pricePerPerson ? (
          <p className="mt-1 text-sm font-bold text-slate-700">
            {[venue.courseTitle, venue.pricePerPerson ? `1人 ${yen(venue.pricePerPerson)}` : null].filter(Boolean).join("・")}
          </p>
        ) : null}
        {venue.features ? <p className="mt-1 text-sm text-slate-600">{venue.features}</p> : null}
        {venue.recommendation ? <p className="mt-2 text-sm font-semibold text-indigo-700">{venue.recommendation}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {canManage ? (
        <form onSubmit={handleSuggest} className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <label htmlFor="venueRequest" className="flex items-center gap-2 text-sm font-black text-violet-900">
            <Sparkles className="size-4" aria-hidden="true" /> AIに店舗を探してもらう
          </label>
          <p className="mt-1 text-xs text-violet-700">参加人数と登録済みの食事要望も検索条件に含めます。現在はWeb検索結果を参考候補として表示するため、詳細はリンク先で確認してください。</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input id="venueRequest" name="venueRequest" required maxLength={500} className="min-h-11 min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3" placeholder="例：新宿駅周辺、1人5,000円、個室・飲み放題" />
            <Button type="submit" disabled={pending !== null}>
              {pending === "suggest" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
              {pending === "suggest" ? "検索中…" : "AIに検索を依頼"}
            </Button>
          </div>
        </form>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-violet-200 p-4">
          <h3 className="font-black">Web検索の参考候補</h3>
          {suggestions.map((suggestion) => (
            <div key={suggestion.name} className="flex flex-col justify-between gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
              <VenueDetails venue={suggestion} />
              <Button type="button" size="sm" variant="secondary" disabled={pending !== null} onClick={() => void handleAdd(suggestion)}>
                {pending === `add-${suggestion.name}` ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Store className="size-4" aria-hidden="true" />}
                候補に追加
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{message}</p> : null}

      {venues.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">店舗候補はまだありません。</p>
      ) : (
        <div className="space-y-3">
          {venues.map((venue) => (
            <article key={venue.id} className={`rounded-2xl border p-5 ${venue.isDecided ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <VenueDetails venue={venue} />
                    {venue.isDecided ? <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">決定</span> : null}
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-600">{venue.votes.length}票</p>
                  {venue.votes.length > 0 ? <p className="mt-1 text-xs text-slate-500">{venue.votes.map((vote) => vote.participant.name).join("、")}</p> : null}
                </div>
                {canManage && !venue.isDecided ? (
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" size="sm" disabled={pending !== null} onClick={() => void handleDecide(venue.id)}>
                      {pending === `decide-${venue.id}` ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                      この店に決定
                    </Button>
                    <Button type="button" size="sm" variant="secondary" aria-label={`${venue.name}を削除`} disabled={pending !== null} onClick={() => void handleDelete(venue.id)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
