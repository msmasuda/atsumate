import { KeyRound } from "lucide-react";

import { resetPasswordAction } from "@/app/signin/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "新しいパスワード" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <KeyRound className="size-10 text-indigo-600" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-black">新しいパスワード</h1>
        {params.error || !params.token ? <p className="mt-4 text-sm font-semibold text-red-700" role="alert">再設定URLが無効または期限切れです。</p> : null}
        {params.token ? (
          <form action={resetPasswordAction} className="mt-7 space-y-3">
            <input type="hidden" name="token" value={params.token} />
            <label htmlFor="password" className="block text-sm font-bold">パスワード</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={15} maxLength={128} required className="min-h-12 w-full rounded-xl border border-slate-300 px-4" />
            <label htmlFor="passwordConfirmation" className="block text-sm font-bold">パスワード（確認）</label>
            <input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={15} maxLength={128} required className="min-h-12 w-full rounded-xl border border-slate-300 px-4" />
            <Button type="submit" className="w-full">パスワードを変更</Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
