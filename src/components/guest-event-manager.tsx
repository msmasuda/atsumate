"use client";

import { Check, CircleDollarSign, LoaderCircle, ReceiptText, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Expense = {
  id: string;
  title: string;
  amount: number;
  status: string;
  rejectionReason: string | null;
};

type Settlement = {
  id: string;
  amount: number;
  status: string;
  participantName: string;
};

type GuestEventManagerProps = {
  inviteToken: string;
  eventStatus: string;
  initialAttendance: string;
  expenses: Expense[];
  settlementsToPay: Settlement[];
  settlementsToReceive: Settlement[];
};

const attendanceLabels: Record<string, string> = {
  ATTENDING: "参加する",
  UNDECIDED: "未回答",
  DECLINED: "参加しない",
};

const expenseStatusLabels: Record<string, string> = {
  SUBMITTED: "承認待ち",
  APPROVED: "承認済み",
  REJECTED: "却下",
};

const settlementStatusLabels: Record<string, string> = {
  UNPAID: "未払い",
  REPORTED_PAID: "確認待ち",
  CONFIRMED: "完了",
};

function yen(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export function GuestEventManager({
  inviteToken,
  eventStatus,
  initialAttendance,
  expenses,
  settlementsToPay,
  settlementsToReceive,
}: GuestEventManagerProps) {
  const router = useRouter();
  const [attendance, setAttendance] = useState(initialAttendance);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canChangeAttendance = eventStatus === "CONFIRMED" || eventStatus === "IN_PROGRESS";
  const canSubmitExpense =
    attendance === "ATTENDING" && ["CONFIRMED", "IN_PROGRESS", "SETTLING"].includes(eventStatus);

  async function saveAttendance(value: "ATTENDING" | "DECLINED") {
    setPending("attendance");
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/invitations/${inviteToken}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance: value }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setMessage(result.error ?? "参加可否を保存できませんでした。");
      setAttendance(value);
      setMessage("参加可否を保存しました。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending("expense");
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/invitations/${inviteToken}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.get("title"), amount: Number(form.get("amount")) }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setMessage(result.error ?? "立替を申請できませんでした。");
      formElement.reset();
      setMessage("立替を申請しました。幹事の承認をお待ちください。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function reportPaid(settlementId: string) {
    setPending(`settlement-${settlementId}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/invitations/${inviteToken}/settlements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setMessage(result.error ?? "支払いを報告できませんでした。");
      setMessage("支払い済みとして幹事へ報告しました。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black">参加可否</h2>
        {canChangeAttendance ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button type="button" variant={attendance === "ATTENDING" ? "default" : "secondary"} disabled={pending !== null} onClick={() => void saveAttendance("ATTENDING")}>
              <Check className="size-4" aria-hidden="true" /> 参加する
            </Button>
            <Button type="button" variant={attendance === "DECLINED" ? "default" : "secondary"} disabled={pending !== null} onClick={() => void saveAttendance("DECLINED")}>
              参加しない
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm font-bold text-slate-600">{attendanceLabels[attendance] ?? attendance}</p>
        )}
      </section>

      {canSubmitExpense ? (
        <section className="rounded-2xl border border-slate-200 p-5">
          <h2 className="flex items-center gap-2 text-lg font-black"><ReceiptText className="size-5" aria-hidden="true" /> 立替を申請</h2>
          <form onSubmit={submitExpense} className="mt-4 grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <div>
              <label htmlFor="expense-title" className="text-sm font-bold">内容</label>
              <input id="expense-title" name="title" required maxLength={120} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="例：飲食代" />
            </div>
            <div>
              <label htmlFor="expense-amount" className="text-sm font-bold">金額（円）</label>
              <input id="expense-amount" name="amount" type="number" required min={1} max={100_000_000} step={1} inputMode="numeric" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
            </div>
            <Button type="submit" disabled={pending !== null}>
              {pending === "expense" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              申請
            </Button>
          </form>
        </section>
      ) : null}

      {expenses.length > 0 ? (
        <section>
          <h2 className="text-lg font-black">自分の立替</h2>
          <div className="mt-3 space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <span className="font-bold">{expense.title}</span>
                <span className="shrink-0">{yen(expense.amount)}・{expenseStatusLabels[expense.status] ?? expense.status}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {settlementsToPay.length > 0 || settlementsToReceive.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-black"><CircleDollarSign className="size-5" aria-hidden="true" /> 精算</h2>
          <div className="mt-4 space-y-3">
            {settlementsToPay.map((settlement) => (
              <div key={settlement.id} className="rounded-xl bg-white p-4">
                <p className="font-bold">{settlement.participantName}さんへ {yen(settlement.amount)}</p>
                <p className="mt-1 text-xs text-slate-500">{settlementStatusLabels[settlement.status] ?? settlement.status}</p>
                {settlement.status === "UNPAID" ? (
                  <Button type="button" size="sm" className="mt-3" disabled={pending !== null} onClick={() => void reportPaid(settlement.id)}>
                    {pending === `settlement-${settlement.id}` ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                    支払い済みを報告
                  </Button>
                ) : null}
              </div>
            ))}
            {settlementsToReceive.map((settlement) => (
              <div key={settlement.id} className="rounded-xl bg-white p-4">
                <p className="font-bold">{settlement.participantName}さんから {yen(settlement.amount)}</p>
                <p className="mt-1 text-xs text-slate-500">{settlementStatusLabels[settlement.status] ?? settlement.status}</p>
              </div>
            ))}
          </div>
        </section>
      ) : eventStatus === "SETTLING" || eventStatus === "COMPLETED" ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">あなたの支払いはありません。</p>
      ) : null}

      {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold" role="status">{message}</p> : null}
    </div>
  );
}
