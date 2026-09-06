import { ArrowLeft, KeyRound } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { KeycloakSignInButton } from "@/components/keycloak-sign-in-button";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

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
        <KeycloakSignInButton />
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">参加者はログイン不要です。幹事から届いた招待URLを開いてください。</p>
      </div>
    </main>
  );
}
