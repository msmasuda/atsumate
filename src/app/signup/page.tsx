import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/auth";

import { signUpWithPassword } from "../signin/actions";

export const metadata = { title: "新規登録" };
export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAuthenticatedUser()) redirect("/");
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/signin" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" aria-hidden="true" /> ログインへ戻る
        </Link>
        <span className="mt-8 grid size-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
          <UserPlus className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-black">幹事アカウントを作成</h1>
        <p className="mt-2 leading-7 text-slate-600">メールアドレスとパスワードを登録します。</p>
        {params.error ? (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
            {params.error === "confirmation"
              ? "確認用パスワードが一致しません。"
              : "登録内容を確認して、もう一度お試しください。"}
          </p>
        ) : null}
        <form action={signUpWithPassword} className="mt-7 space-y-3">
          <label htmlFor="signup-name" className="block text-sm font-bold">表示名</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={80}
            required
            className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <label htmlFor="signup-email" className="block text-sm font-bold">メールアドレス</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <label htmlFor="signup-password" className="block text-sm font-bold">パスワード</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={15}
            maxLength={128}
            required
            className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <label htmlFor="password-confirmation" className="block text-sm font-bold">パスワード（確認）</label>
          <input
            id="password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={15}
            maxLength={128}
            required
            className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <Button type="submit" className="w-full">新規登録</Button>
        </form>
        <p className="mt-3 text-xs leading-5 text-slate-500">パスワードは15文字以上で設定してください。</p>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">参加者はアカウントを作成する必要はありません。</p>
      </div>
    </main>
  );
}
