import { CalendarDays, Users } from "lucide-react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { GuestJoinForm } from "@/components/guest-join-form";
import { getPrisma } from "@/lib/db";
import { hashGuestToken } from "@/lib/security/tokens";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const event = await getPrisma().event.findUnique({
    where: { inviteTokenHash: hashGuestToken(token) },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      timezone: true,
      dateOptions: {
        orderBy: { startAt: "asc" },
        select: { id: true, startAt: true, endAt: true, isDecided: true },
      },
      _count: { select: { participants: true } },
    },
  });
  if (!event || event.status === "CANCELLED") notFound();

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(`atsumate_guest_${event.id}`)?.value;
  const participant = guestToken
    ? await getPrisma().participant.findFirst({
        where: {
          eventId: event.id,
          guestTokenHash: hashGuestToken(guestToken),
          revokedAt: null,
        },
        select: {
          id: true,
          name: true,
          attendance: true,
          dateVotes: { select: { optionId: true, status: true, conditionNote: true } },
          expensesSubmitted: {
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, amount: true, status: true, rejectionReason: true },
          },
          settlementsToPay: {
            where: { settlementRun: { status: "FINALIZED" } },
            select: { id: true, amount: true, status: true, to: { select: { name: true } } },
          },
          settlementsToReceive: {
            where: { settlementRun: { status: "FINALIZED" } },
            select: { id: true, amount: true, status: true, from: { select: { name: true } } },
          },
        },
      })
    : null;
  if (["SETTLING", "COMPLETED"].includes(event.status) && !participant) notFound();

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 font-black text-white">集</span>
          <span className="font-black">atsumate</span>
        </div>
        <p className="mt-8 text-sm font-bold text-indigo-600">集まりへの招待</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{event.title}</h1>
        {event.description ? <p className="mt-3 leading-7 text-slate-600">{event.description}</p> : null}
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
          <span className="flex items-center gap-2"><CalendarDays className="size-4" /> {event.status === "PLANNING" ? "日程調整中" : "日程決定済み"}</span>
          <span className="flex items-center gap-2"><Users className="size-4" /> {event._count.participants}名が登録</span>
        </div>
        <div className="my-7 border-t border-slate-200" />
        {!participant ? (
          <>
            <h2 className="text-lg font-black">あなたの情報を入力</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">ログインは不要です。この端末から後で回答を変更できます。</p>
          </>
        ) : null}
        <GuestJoinForm
          inviteToken={token}
          initialParticipant={participant}
          eventStatus={event.status}
          timeZone={event.timezone}
          dateOptions={event.dateOptions.map((option) => ({
            ...option,
            startAt: option.startAt.toISOString(),
            endAt: option.endAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </main>
  );
}
