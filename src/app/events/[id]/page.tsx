import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { DateOptionManager } from "@/components/date-option-manager";
import { Card } from "@/components/ui/card";
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
        select: { id: true, name: true, isKeyPerson: true },
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
            <p className="text-sm font-bold text-indigo-600">日程調整</p>
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
      </div>
    </AppShell>
  );
}
