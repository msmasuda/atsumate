import { ArrowLeft, CalendarDays, CircleDollarSign, Store, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AccountingManager } from "@/components/accounting-manager";
import { DateOptionManager } from "@/components/date-option-manager";
import { Card } from "@/components/ui/card";
import { VenueOptionManager } from "@/components/venue-option-manager";
import { getAuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EventPage({ params }: PageProps) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const event = await getPrisma().event.findFirst({
    where: { id, organizerId: user.id },
    select: {
      id: true,
      title: true,
      description: true,
      timezone: true,
      status: true,
      participants: {
        where: { revokedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, isKeyPerson: true, attendance: true, dietaryRequirements: true },
      },
      venueOptions: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          url: true,
          courseTitle: true,
          pricePerPerson: true,
          features: true,
          recommendation: true,
          isDecided: true,
          votes: {
            select: { participantId: true, participant: { select: { name: true } } },
          },
        },
      },
      dateOptions: {
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          isDecided: true,
          votes: {
            select: {
              participantId: true,
              status: true,
              conditionNote: true,
              participant: { select: { id: true, name: true, isKeyPerson: true } },
            },
          },
        },
      },
      expenses: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          amount: true,
          status: true,
          submittedBy: { select: { name: true } },
          paidBy: { select: { name: true } },
        },
      },
      settlementRuns: {
        where: { status: "FINALIZED" },
        orderBy: { version: "desc" },
        take: 1,
        select: {
          version: true,
          totalExpense: true,
          settlements: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              amount: true,
              status: true,
              from: { select: { name: true } },
              to: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!event) notFound();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" aria-hidden="true" /> ホームへ戻る
        </Link>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-indigo-600">イベント管理</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">{event.title}</h1>
            {event.description ? <p className="mt-2 leading-7 text-slate-600">{event.description}</p> : null}
          </div>
          <p className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-500">
            <Users className="size-4" aria-hidden="true" /> 参加者 {event.participants.length}名
          </p>
        </div>

        <Card className="mt-7 p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-black">候補日と回答状況</h2>
              <p className="mt-1 text-sm text-slate-500">候補日を追加し、回答が揃ったら開催日時を決定します。</p>
            </div>
          </div>
          <DateOptionManager
            eventId={event.id}
            eventStatus={event.status}
            timeZone={event.timezone}
            participants={event.participants}
            options={event.dateOptions.map((option) => ({
              ...option,
              startAt: option.startAt.toISOString(),
              endAt: option.endAt?.toISOString() ?? null,
            }))}
          />
        </Card>

        <Card className="mt-7 p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <Store className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-black">店舗候補と投票状況</h2>
              <p className="mt-1 text-sm text-slate-500">AIで候補を探し、参加者の投票を見て開催店舗を決定します。</p>
            </div>
          </div>
          <VenueOptionManager eventId={event.id} eventStatus={event.status} venues={event.venueOptions} />
        </Card>

        <Card className="mt-7 p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <CircleDollarSign className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-black">参加者と会計</h2>
              <p className="mt-1 text-sm text-slate-500">参加可否、立替申請、精算状況を管理します。</p>
            </div>
          </div>
          <AccountingManager
            eventId={event.id}
            eventStatus={event.status}
            participants={event.participants}
            expenses={event.expenses}
            settlementRun={event.settlementRuns[0] ?? null}
          />
        </Card>
      </div>
    </AppShell>
  );
}
