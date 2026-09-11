"use client";

import { Check, ExternalLink, LoaderCircle, Store } from "lucide-react";
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
  voteCount: number;
};

type GuestVenueVoteFormProps = {
  inviteToken: string;
  eventStatus: string;
  venues: Venue[];
  initialVenueId: string | null;
};

function yen(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export function GuestVenueVoteForm({ inviteToken, eventStatus, venues, initialVenueId }: GuestVenueVoteFormProps) {
  const router = useRouter();
  const [venueId, setVenueId] = useState(initialVenueId ?? "");
  const [savedVenueId, setSavedVenueId] = useState(initialVenueId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const decided = venues.find((venue) => venue.isDecided);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/invitations/${inviteToken}/venue-votes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "投票を保存できませんでした。");
        return;
      }
      setSavedVenueId(venueId);
      setMessage("店舗への投票を保存しました。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (decided) {
    return (
      <section className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 font-black text-emerald-900"><Check className="size-5" aria-hidden="true" /> 開催店舗が決まりました</p>
        <p className="mt-2 text-lg font-black">{decided.name}</p>
        {decided.url ? <a href={decided.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-indigo-700 hover:underline">店舗ページを開く <ExternalLink className="size-4" aria-hidden="true" /></a> : null}
      </section>
    );
  }

  if (!["PLANNING", "CONFIRMED"].includes(eventStatus)) return null;

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black"><Store className="size-5" aria-hidden="true" /> 行きたい店舗へ投票</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">候補から1店舗を選んでください。投票は後から変更できます。</p>
      </div>
      {venues.map((venue) => (
        <label key={venue.id} className="block cursor-pointer rounded-2xl border border-slate-200 p-4 has-checked:border-indigo-500 has-checked:bg-indigo-50">
          <span className="flex items-start gap-3">
            <input type="radio" name="venueId" value={venue.id} required checked={venueId === venue.id} onChange={() => setVenueId(venue.id)} className="mt-1" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-black">{venue.name}</span>
                <span className="text-xs font-bold text-slate-500">{venue.voteCount}票</span>
              </span>
              {venue.courseTitle || venue.pricePerPerson ? <span className="mt-1 block text-sm font-bold text-slate-700">{[venue.courseTitle, venue.pricePerPerson ? `1人 ${yen(venue.pricePerPerson)}` : null].filter(Boolean).join("・")}</span> : null}
              {venue.features ? <span className="mt-1 block text-sm text-slate-600">{venue.features}</span> : null}
              {venue.recommendation ? <span className="mt-2 block text-sm font-semibold text-indigo-700">{venue.recommendation}</span> : null}
              {venue.url ? <a href={venue.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline" onClick={(event) => event.stopPropagation()}>店舗ページ <ExternalLink className="size-3" aria-hidden="true" /></a> : null}
            </span>
          </span>
        </label>
      ))}
      {message ? <p className={`rounded-xl p-3 text-sm font-semibold ${message.startsWith("店舗への投票") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`} role="status">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting || !venueId} className="w-full">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
        {isSubmitting ? "保存しています…" : savedVenueId ? "投票を変更" : "この店舗に投票"}
      </Button>
    </form>
  );
}
