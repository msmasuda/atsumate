import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Users,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const steps = [
  { label: "企画", done: true },
  { label: "日程調整", done: true },
  { label: "準備", done: false },
  { label: "会計", done: false },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <AppShell session={session}>
      <div className="flex flex-col gap-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-indigo-600">9月6日 日曜日</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">集まりの準備を進めよう</h1>
            <p className="mt-2 text-base text-slate-600">次に必要なことを、イベントごとに整理しています。</p>
          </div>
          <Link href="/events/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            新しい集まりを作る
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <section aria-labelledby="next-action-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="next-action-title" className="text-lg font-black">次にやること</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">2件</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-l-4 border-l-amber-400 p-5">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <CalendarClock className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amber-700">回答期限まであと2日</p>
                  <h3 className="mt-1 font-black">プロジェクト打ち上げ</h3>
                  <p className="mt-1 text-sm text-slate-500">3名がまだ日程に回答していません</p>
                  <button className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800">
                    回答状況を見る <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-indigo-500 p-5">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                  <CircleDollarSign className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-indigo-700">立替申請が届いています</p>
                  <h3 className="mt-1 font-black">週末バーベキュー</h3>
                  <p className="mt-1 text-sm text-slate-500">食材費 ¥18,240 の確認が必要です</p>
                  <button className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800">
                    内容を確認する <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section aria-labelledby="events-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="events-title" className="text-lg font-black">進行中の集まり</h2>
            <button className="text-sm font-bold text-slate-500 hover:text-slate-900">すべて見る</button>
          </div>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">日程調整中</span>
                    <span className="text-sm text-slate-500">回答期限 9月8日</span>
                  </div>
                  <h3 className="mt-3 text-xl font-black">プロジェクト打ち上げ</h3>
                  <p className="mt-1 text-sm text-slate-500">渋谷周辺・予算 ¥5,000</p>
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <span className="flex items-center gap-2 font-bold"><Users className="size-4 text-slate-400" /> 12名</span>
                  <span className="flex items-center gap-2 font-bold"><CalendarCheck className="size-4 text-slate-400" /> 3候補</span>
                </div>
              </div>

              <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="イベント進行状況">
                {steps.map((step, index) => (
                  <li key={step.label} className="relative">
                    <div className={cn("mb-2 h-1.5 rounded-full", step.done ? "bg-emerald-500" : index === 2 ? "bg-indigo-500" : "bg-slate-200")} />
                    <span className={cn("flex items-center gap-1 text-xs font-bold sm:text-sm", step.done ? "text-emerald-700" : index === 2 ? "text-indigo-700" : "text-slate-400")}>
                      {step.done ? <Check className="hidden size-3.5 sm:block" aria-hidden="true" /> : null}
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-col items-start justify-between gap-3 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <p className="flex items-center gap-2 text-sm text-slate-600"><Clock3 className="size-4" /> 最終更新 10分前</p>
              <button className="inline-flex min-h-10 items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800">
                イベントを開く <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </Card>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-500">今月の集まり</p>
            <p className="mt-2 text-3xl font-black">3<span className="ml-1 text-base text-slate-500">件</span></p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-500">参加予定</p>
            <p className="mt-2 text-3xl font-black">27<span className="ml-1 text-base text-slate-500">名</span></p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-500">精算待ち</p>
            <p className="mt-2 text-3xl font-black text-amber-600">¥8,420</p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
