import { CalendarDays, CircleDollarSign, LayoutDashboard, LogIn, Plus, Users } from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { buttonVariants } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "ホーム", icon: LayoutDashboard, current: true },
  { label: "日程調整", icon: CalendarDays, current: false },
  { label: "参加者", icon: Users, current: false },
  { label: "会計", icon: CircleDollarSign, current: false },
];

export function AppShell({ children, user }: { children: React.ReactNode; user: AuthUser | null }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="atsumate ホーム">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white">集</span>
            <span className="text-lg font-black tracking-tight">atsumate</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <AccountMenu name={user.name ?? user.email ?? "ログイン中"} />
            ) : (
              <Link href="/signin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <LogIn className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">幹事ログイン</span>
                <span className="sm:hidden">ログイン</span>
              </Link>
            )}
            <Link href="/events/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" aria-hidden="true" />
              集まりを作る
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 px-4 py-8 lg:block">
          <nav aria-label="メインナビゲーション" className="space-y-1">
            {navigation.map(({ label, icon: Icon, current }) => (
              <span
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                  current ? "bg-indigo-50 text-indigo-700" : "text-slate-500",
                )}
                aria-current={current ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </span>
            ))}
          </nav>
          <div className="mt-10 rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-xs font-bold text-indigo-300">MVP</p>
            <p className="mt-2 text-sm font-bold">企画から精算まで、まず一本につなげます。</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">AI副幹事は次のフェーズで接続予定です。</p>
          </div>
        </aside>
        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
