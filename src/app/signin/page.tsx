import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/auth";

import { sendMagicLink, signInWithGoogle, signInWithPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string; sent?: string }>;
}) {
  if (await getAuthenticatedUser()) redirect("/");
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" aria-hidden="true" /> ホームへ戻る
        </Link>
        <span className="mt-8 grid size-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-black">幹事としてログイン</h1>
        <p className="mt-2 leading-7 text-slate-600">イベントの作成や編集、会計の確定にはログインが必要です。</p>
        {params.error ? (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
            ログインを完了できませんでした。もう一度お試しください。
          </p>
        ) : null}
        {params.sent ? (
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700" role="status">
            ログインリンクを送信しました。メールをご確認ください。
          </p>
        ) : null}
        {params.registered ? (
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700" role="status">
            確認メールを送信しました。メール内のリンクから登録を完了してください。
          </p>
        ) : null}
        <form action={signInWithGoogle}>
          <Button type="submit" className="mt-7 w-full">Googleで続ける</Button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-200" />または<span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action={signInWithPassword} className="space-y-3">
          <label htmlFor="password-email" className="block text-sm font-bold">メールアドレス</label>
          <input
            id="password-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <label htmlFor="password" className="block text-sm font-bold">パスワード</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <Button type="submit" className="w-full">メールアドレスでログイン</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          初めて利用する方は <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-700">新規登録</Link>
        </p>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-200" />パスワードを使わない場合<span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action={sendMagicLink} className="space-y-3">
          <label htmlFor="magic-email" className="block text-sm font-bold">メールアドレス</label>
          <input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <Button type="submit" variant="secondary" className="w-full">ログインリンクを受け取る</Button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">参加者はログイン不要です。幹事から届いた招待URLを開いてください。</p>
      </div>
    </main>
  );
}
