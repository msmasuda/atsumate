import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock3,
  Inbox,
  LogIn,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EventStatus } from "@/generated/prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const steps = ["企画", "日程調整", "準備", "会計"] as const;

const statusPresentation: Record<
  EventStatus,
  { label: string; badgeClassName: string; currentStep: number }
> = {
  PLANNING: {
    label: "日程調整中",
    badgeClassName: "bg-indigo-100 text-indigo-700",
    currentStep: 1,
  },
  CONFIRMED: {
    label: "開催準備中",
    badgeClassName: "bg-sky-100 text-sky-700",
    currentStep: 2,
  },
  IN_PROGRESS: {
    label: "開催中",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    currentStep: 2,
  },
  SETTLING: {
    label: "精算中",
    badgeClassName: "bg-amber-100 text-amber-800",
    currentStep: 3,
  },
  COMPLETED: {
    label: "完了",
    badgeClassName: "bg-slate-200 text-slate-700",
    currentStep: steps.length,
  },
  CANCELLED: {
    label: "中止",
    badgeClassName: "bg-red-100 text-red-700",
    currentStep: -1,
  },
};

function formatDate(
  value: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { timeZone, ...options }).format(value);
  } catch {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      ...options,
    }).format(value);
  }
}

function formatDeadline(value: Date, timeZone: string) {
  return formatDate(value, timeZone, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUpdatedAt(value: Date, timeZone: string) {
  return formatDate(value, timeZone, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getOrganizerEvents(authUserId: string) {
  return getPrisma().event.findMany({
    where: { organizer: { authUserId } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      timezone: true,
      status: true,
      eventDate: true,
      responseDueAt: true,
      updatedAt: true,
      _count: {
        select: {
          participants: true,
          dateOptions: true,
          expenses: { where: { status: "SUBMITTED" } },
        },
      },
    },
  });
}

export default async function Home() {
  const user = await getAuthenticatedUser();
  const events = user ? await getOrganizerEvents(user.id) : [];
  const activeEvents = events.filter(
    (event) => event.status !== "COMPLETED" && event.status !== "CANCELLED",
  );
  const archivedEvents = events.filter(
    (event) => event.status === "COMPLETED" || event.status === "CANCELLED",
  );
  const participantCount = activeEvents.reduce(
    (total, event) => total + event._count.participants,
    0,
  );
  const pendingExpenseCount = activeEvents.reduce(
    (total, event) => total + event._count.expenses,
    0,
  );
  const renderedAt = new Date();
  const actions = activeEvents.flatMap((event) => {
    const eventActions: Array<{
      key: string;
      kind: "deadline" | "expense";
      title: string;
      eventTitle: string;
      detail: string;
    }> = [];

    if (event.status === "PLANNING" && event.responseDueAt) {
      const overdue = event.responseDueAt.getTime() < renderedAt.getTime();
      eventActions.push({
        key: `${event.id}-deadline`,
        kind: "deadline",
        title: overdue ? "回答期限を過ぎています" : "回答期限を確認",
        eventTitle: event.title,
        detail: `${formatDeadline(event.responseDueAt, event.timezone)}${overdue ? "まででした" : "まで"}`,
      });
    }

    if (event._count.expenses > 0) {
      eventActions.push({
        key: `${event.id}-expense`,
        kind: "expense",
        title: "立替申請が届いています",
        eventTitle: event.title,
        detail: `${event._count.expenses}件の確認が必要です`,
      });
    }

    return eventActions;
  });
  const today = `${formatDate(renderedAt, "Asia/Tokyo", {
    month: "long",
    day: "numeric",
  })} ${formatDate(renderedAt, "Asia/Tokyo", { weekday: "long" })}`;

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-indigo-600">{today}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              集まりの準備を進めよう
            </h1>
            <p className="mt-2 text-base text-slate-600">
              次に必要なことを、イベントごとに整理しています。
            </p>
          </div>
          <Link href="/events/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            新しい集まりを作る
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {!user ? (
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
                <LogIn className="size-6" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-black">幹事としてログイン</h2>
                <p className="mt-1 leading-7 text-slate-600">
                  ログインすると、あなたが作成した集まりと次に必要な対応を確認できます。
                </p>
              </div>
              <Link href="/signin" className={buttonVariants({ variant: "secondary" })}>
                ログイン画面へ
              </Link>
            </div>
          </Card>
        ) : events.length === 0 ? (
          <Card className="grid place-items-center px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Inbox className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-black">最初の集まりを作りましょう</h2>
            <p className="mt-2 max-w-md leading-7 text-slate-600">
              集まりを作成すると、参加者数や日程候補、回答期限をここでまとめて確認できます。
            </p>
            <Link href="/events/new" className={cn(buttonVariants(), "mt-6")}>
              集まりを作る
            </Link>
          </Card>
        ) : (
          <>
            <section aria-labelledby="next-action-title">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="next-action-title" className="text-lg font-black">
                  次にやること
                </h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {actions.length}件
                </span>
              </div>
              {actions.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {actions.map((action) => {
                    const isExpense = action.kind === "expense";
                    const Icon = isExpense ? CircleDollarSign : CalendarClock;
                    return (
                      <Card
                        key={action.key}
                        className={cn(
                          "border-l-4 p-5",
                          isExpense ? "border-l-indigo-500" : "border-l-amber-400",
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <span
                            className={cn(
                              "grid size-10 shrink-0 place-items-center rounded-xl",
                              isExpense
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-amber-100 text-amber-700",
                            )}
                          >
                            <Icon className="size-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-sm font-bold",
                                isExpense ? "text-indigo-700" : "text-amber-700",
                              )}
                            >
                              {action.title}
                            </p>
                            <h3 className="mt-1 font-black">{action.eventTitle}</h3>
                            <p className="mt-1 text-sm text-slate-500">{action.detail}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-5">
                  <p className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <Check className="size-5 text-emerald-600" aria-hidden="true" />
                    現在、期限や承認待ちの対応はありません。
                  </p>
                </Card>
              )}
            </section>

            <section aria-labelledby="events-title">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="events-title" className="text-lg font-black">
                  進行中の集まり
                </h2>
                <span className="text-sm font-bold text-slate-500">{activeEvents.length}件</span>
              </div>
              {activeEvents.length > 0 ? (
                <div className="space-y-4">
                  {activeEvents.map((event) => {
                    const presentation = statusPresentation[event.status];
                    return (
                      <Card key={event.id} className="overflow-hidden">
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded-full px-2.5 py-1 text-xs font-bold",
                                    presentation.badgeClassName,
                                  )}
                                >
                                  {presentation.label}
                                </span>
                                {event.responseDueAt ? (
                                  <span className="text-sm text-slate-500">
                                    回答期限 {formatDeadline(event.responseDueAt, event.timezone)}
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="mt-3 text-xl font-black">{event.title}</h3>
                              {event.description ? (
                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                  {event.description}
                                </p>
                              ) : null}
                              {event.eventDate ? (
                                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                                  <CalendarCheck className="size-4 text-slate-400" aria-hidden="true" />
                                  開催日 {formatDeadline(event.eventDate, event.timezone)}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-5 text-sm">
                              <span className="flex items-center gap-2 font-bold">
                                <Users className="size-4 text-slate-400" aria-hidden="true" />
                                {event._count.participants}名
                              </span>
                              <span className="flex items-center gap-2 font-bold">
                                <CalendarCheck className="size-4 text-slate-400" aria-hidden="true" />
                                {event._count.dateOptions}候補
                              </span>
                            </div>
                          </div>

                          <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="イベント進行状況">
                            {steps.map((step, index) => {
                              const done = index < presentation.currentStep;
                              const current = index === presentation.currentStep;
                              return (
                                <li key={step} className="relative">
                                  <div
                                    className={cn(
                                      "mb-2 h-1.5 rounded-full",
                                      done
                                        ? "bg-emerald-500"
                                        : current
                                          ? "bg-indigo-500"
                                          : "bg-slate-200",
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-bold sm:text-sm",
                                      done
                                        ? "text-emerald-700"
                                        : current
                                          ? "text-indigo-700"
                                          : "text-slate-400",
                                    )}
                                  >
                                    {done ? (
                                      <Check className="hidden size-3.5 sm:block" aria-hidden="true" />
                                    ) : null}
                                    {step}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                        <div className="bg-slate-50 px-5 py-4 sm:px-6">
                          <p className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock3 className="size-4" aria-hidden="true" />
                            最終更新 {formatUpdatedAt(event.updatedAt, event.timezone)}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-5 text-sm font-semibold text-slate-600">
                  進行中の集まりはありません。
                </Card>
              )}
            </section>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <p className="text-sm font-bold text-slate-500">進行中の集まり</p>
                <p className="mt-2 text-3xl font-black">
                  {activeEvents.length}
                  <span className="ml-1 text-base text-slate-500">件</span>
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm font-bold text-slate-500">登録参加者</p>
                <p className="mt-2 text-3xl font-black">
                  {participantCount}
                  <span className="ml-1 text-base text-slate-500">名</span>
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm font-bold text-slate-500">未承認の立替</p>
                <p className="mt-2 text-3xl font-black text-amber-600">
                  {pendingExpenseCount}
                  <span className="ml-1 text-base text-slate-500">件</span>
                </p>
              </Card>
            </div>

            {archivedEvents.length > 0 ? (
              <section aria-labelledby="archived-events-title">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="archived-events-title" className="text-lg font-black">
                    終了した集まり
                  </h2>
                  <span className="text-sm font-bold text-slate-500">{archivedEvents.length}件</span>
                </div>
                <Card className="divide-y divide-slate-200 overflow-hidden">
                  {archivedEvents.map((event) => {
                    const presentation = statusPresentation[event.status];
                    return (
                      <div
                        key={event.id}
                        className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-bold",
                              presentation.badgeClassName,
                            )}
                          >
                            {presentation.label}
                          </span>
                          <h3 className="mt-2 font-black">{event.title}</h3>
                        </div>
                        <p className="text-sm text-slate-500">
                          参加者 {event._count.participants}名・最終更新{" "}
                          {formatUpdatedAt(event.updatedAt, event.timezone)}
                        </p>
                      </div>
                    );
                  })}
                </Card>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
