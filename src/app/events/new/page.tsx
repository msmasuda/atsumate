import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EventCreateForm } from "@/components/event-create-form";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata = { title: "新しい集まり" };
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  if (!(await getAuthenticatedUser())) redirect("/signin");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" aria-hidden="true" /> ホームへ戻る
        </Link>
        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-bold text-indigo-600">STEP 1</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">新しい集まり</h1>
          <p className="mt-2 leading-7 text-slate-600">まず名前だけ決めれば始められます。日程や会計方法は後から設定できます。</p>
          <div className="my-7 border-t border-slate-200" />
          <EventCreateForm />
        </div>
      </div>
    </main>
  );
}
