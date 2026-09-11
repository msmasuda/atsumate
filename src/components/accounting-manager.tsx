"use client";

import { Check, CircleDollarSign, LoaderCircle, ReceiptText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Participant = { id: string; name: string; attendance: string };
type Expense = {
  id: string;
  title: string;
  amount: number;
  status: string;
  submittedBy: { name: string };
  paidBy: { name: string };
};
type SettlementRun = {
  version: number;
  totalExpense: number;
  settlements: Array<{
    id: string;
    amount: number;
    status: string;
    from: { name: string };
    to: { name: string };
  }>;
} | null;

type AccountingManagerProps = {
  eventId: string;
  eventStatus: string;
  participants: Participant[];
  expenses: Expense[];
  settlementRun: SettlementRun;
};

const attendanceLabels: Record<string, string> = {
  ATTENDING: "参加",
  UNDECIDED: "未回答",
  DECLINED: "不参加",
};
const expenseStatusLabels: Record<string, string> = {
  SUBMITTED: "承認待ち",
  APPROVED: "承認済み",
  REJECTED: "却下",
};
const settlementStatusLabels: Record<string, string> = {
  UNPAID: "未払い",
  REPORTED_PAID: "支払報告あり",
  CONFIRMED: "完了",
};

function yen(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export function AccountingManager({ eventId, eventStatus, participants, expenses, settlementRun }: AccountingManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const approvedTotal = expenses.filter((expense) => expense.status === "APPROVED").reduce((sum, expense) => sum + expense.amount, 0);
  const canSettle = ["CONFIRMED", "IN_PROGRESS", "SETTLING"].includes(eventStatus);

  async function updateExpense(expenseId: string, status: "APPROVED" | "REJECTED") {
    setPending(`expense-${expenseId}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/expenses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId, status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setMessage(result.error ?? "立替申請を処理できませんでした。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function createSettlement() {
    const text = settlementRun
      ? "現在の精算を残して、新しいバージョンで再計算しますか？"
      : "承認済みの立替を参加者で等分し、精算を確定しますか？";
    if (!window.confirm(text)) return;
    setPending("settlement");
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/settlements`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setMessage(result.error ?? "精算を確定できませんでした。");
      setMessage("精算を確定しました。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function confirmPayment(settlementId: string) {
    setPending(`settlement-${settlementId}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/settlements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setMessage(result.error ?? "支払いを確認できませんでした。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-base font-black">参加状況</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {participants.map((participant) => (
            <span key={participant.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              {participant.name}・{attendanceLabels[participant.attendance] ?? participant.attendance}
            </span>
          ))}
          {participants.length === 0 ? <span className="text-sm text-slate-500">参加登録はまだありません。</span> : null}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-black"><ReceiptText className="size-5" aria-hidden="true" /> 立替申請</h3>
            <p className="mt-1 text-sm text-slate-500">承認済み合計 {yen(approvedTotal)}</p>
          </div>
        </div>
        {expenses.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-bold">{expense.title}・{yen(expense.amount)}</p>
                  <p className="mt-1 text-xs text-slate-500">申請 {expense.submittedBy.name}／支払 {expense.paidBy.name}／{expenseStatusLabels[expense.status] ?? expense.status}</p>
                </div>
                {expense.status === "SUBMITTED" ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={pending !== null} onClick={() => void updateExpense(expense.id, "APPROVED")}>
                      {pending === `expense-${expense.id}` ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} 承認
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={pending !== null} onClick={() => void updateExpense(expense.id, "REJECTED")}>
                      <X className="size-4" aria-hidden="true" /> 却下
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">立替申請はまだありません。</p>}
      </section>

      <section>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h3 className="flex items-center gap-2 text-base font-black"><CircleDollarSign className="size-5" aria-hidden="true" /> 精算</h3>
            <p className="mt-1 text-sm text-slate-500">参加予定者で等分し、1円の端数は登録順に割り当てます。</p>
          </div>
          {canSettle ? (
            <Button type="button" disabled={pending !== null} onClick={() => void createSettlement()}>
              {pending === "settlement" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CircleDollarSign className="size-4" aria-hidden="true" />}
              {settlementRun ? "再計算して確定" : "精算を計算して確定"}
            </Button>
          ) : null}
        </div>

        {settlementRun ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-black">精算 v{settlementRun.version}・総額 {yen(settlementRun.totalExpense)}</p>
            <div className="mt-3 space-y-2">
              {settlementRun.settlements.map((settlement) => (
                <div key={settlement.id} className="flex flex-col justify-between gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-bold">{settlement.from.name} → {settlement.to.name}　{yen(settlement.amount)}</p>
                    <p className="mt-1 text-xs text-slate-500">{settlementStatusLabels[settlement.status] ?? settlement.status}</p>
                  </div>
                  {settlement.status === "REPORTED_PAID" ? (
                    <Button type="button" size="sm" disabled={pending !== null} onClick={() => void confirmPayment(settlement.id)}>
                      {pending === `settlement-${settlement.id}` ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} 入金確認
                    </Button>
                  ) : null}
                </div>
              ))}
              {settlementRun.settlements.length === 0 ? <p className="text-sm font-bold text-emerald-800">送金は不要です。精算完了になりました。</p> : null}
            </div>
          </div>
        ) : null}
      </section>

      {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold" role="status">{message}</p> : null}
    </div>
  );
}
