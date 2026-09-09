import { LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AccountMenu({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="hidden max-w-40 items-center gap-2 truncate text-sm font-bold text-slate-700 sm:flex">
        <UserRound className="size-4 shrink-0 text-indigo-600" aria-hidden="true" />
        <span className="truncate">{name}</span>
      </span>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" size="sm">
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">ログアウト</span>
          <span className="sm:hidden">終了</span>
        </Button>
      </form>
    </div>
  );
}
