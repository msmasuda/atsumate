import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";

import { requestPasswordResetAction } from "@/app/signin/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "パスワード再設定" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/signin" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" aria-hidden="true" /> ログインへ戻る
        </Link>
        <KeyRound className="mt-8 size-10 text-indigo-600" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-black">パスワードを再設定</h1>
        <p className="mt-2 leading-7 text-slate-600">登録済みのメールアドレスへ再設定URLを送ります。</p>
        {params.error ? <p className="mt-5 text-sm font-semibold text-red-700" role="alert">送信できませんでした。時間を置いてお試しください。</p> : null}
        <form action={requestPasswordResetAction} className="mt-7 space-y-3">
          <label htmlFor="email" className="block text-sm font-bold">メールアドレス</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="min-h-12 w-full rounded-xl border border-slate-300 px-4" />
          <Button type="submit" className="w-full">再設定メールを送る</Button>
        </form>
      </div>
    </main>
  );
}
