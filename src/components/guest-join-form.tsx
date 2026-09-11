"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { GuestDateVoteForm } from "@/components/guest-date-vote-form";
import { Button } from "@/components/ui/button";
import type { DateVoteStatus } from "@/lib/date-votes";

type ParticipantSummary = {
  id: string;
  name: string;
  attendance: string;
  venueVotes: Array<{ venueId: string }>;
  dateVotes: Array<{ optionId: string; status: DateVoteStatus; conditionNote: string | null }>;
  expensesSubmitted: Array<{
    id: string;
    title: string;
    amount: number;
    status: string;
    rejectionReason: string | null;
  }>;
  settlementsToPay: Array<{
    id: string;
    amount: number;
    status: string;
    to: { name: string };
  }>;
  settlementsToReceive: Array<{
    id: string;
    amount: number;
    status: string;
    from: { name: string };
  }>;
};
type DateOption = { id: string; startAt: string; endAt: string | null; isDecided: boolean };
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

type GuestJoinFormProps = {
  inviteToken: string;
  initialParticipant: ParticipantSummary | null;
  eventStatus: string;
  timeZone: string;
  dateOptions: DateOption[];
  venues: Venue[];
};

export function GuestJoinForm({ inviteToken, initialParticipant, eventStatus, timeZone, dateOptions, venues }: GuestJoinFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [registeredParticipant, setRegisteredParticipant] = useState<ParticipantSummary | null>(null);
  const submittingRef = useRef(false);
  const participant = initialParticipant ?? registeredParticipant;

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
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email") || undefined,
          dietaryRequirements: data.get("dietaryRequirements") || undefined,
        }),
      });
      const body = (await response.json()) as { data?: ParticipantSummary; error?: string };
      if (!response.ok || !body.data) {
        setMessage(body.error ?? "登録できませんでした。");
        return;
      }
      setRegisteredParticipant(body.data);
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (participant) {
    return (
      <GuestDateVoteForm
        inviteToken={inviteToken}
        participantName={participant.name}
        eventStatus={eventStatus}
        timeZone={timeZone}
        options={dateOptions}
        initialVotes={participant.dateVotes}
        initialAttendance={participant.attendance}
        expenses={participant.expensesSubmitted}
        settlementsToPay={participant.settlementsToPay.map((settlement) => ({
          id: settlement.id,
          amount: settlement.amount,
          status: settlement.status,
          participantName: settlement.to.name,
        }))}
        settlementsToReceive={participant.settlementsToReceive.map((settlement) => ({
          id: settlement.id,
          amount: settlement.amount,
          status: settlement.status,
          participantName: settlement.from.name,
        }))}
        venues={venues}
        initialVenueId={participant.venueVotes[0]?.venueId ?? null}
      />
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
      <div>
        <label htmlFor="dietaryRequirements" className="block text-sm font-bold">食事の要望 <span className="font-normal text-slate-400">（任意）</span></label>
        <textarea id="dietaryRequirements" name="dietaryRequirements" maxLength={300} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="例：甲殻類アレルギー、完全禁煙を希望" />
      </div>
      {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold" role="status">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        {isSubmitting ? "登録しています…" : "参加登録する"}
      </Button>
    </form>
  );
}
