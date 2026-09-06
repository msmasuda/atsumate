import { CalendarDays, Users } from "lucide-react";
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
    select: { title: true, description: true, status: true, _count: { select: { participants: true } } },
  });
  if (!event || event.status === "CANCELLED" || event.status === "COMPLETED") notFound();

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
          <span className="flex items-center gap-2"><CalendarDays className="size-4" /> 日程調整中</span>
          <span className="flex items-center gap-2"><Users className="size-4" /> {event._count.participants}名が登録</span>
        </div>
        <div className="my-7 border-t border-slate-200" />
        <h2 className="text-lg font-black">あなたの情報を入力</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">ログインは不要です。この端末から後で回答を変更できます。</p>
        <GuestJoinForm inviteToken={token} />
      </div>
    </main>
  );
}
