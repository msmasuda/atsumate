import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { calculateEqualSettlement } from "@/lib/settlements/calculate-transfers";

export const runtime = "nodejs";

const settlementSchema = z.object({ settlementId: z.string().min(1) });

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const db = getPrisma();
  const event = await db.event.findFirst({
    where: { id, organizerId: user.id },
    select: {
      id: true,
      status: true,
      participants: {
        where: { attendance: "ATTENDING", revokedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      },
      expenses: {
        orderBy: { createdAt: "asc" },
        select: { id: true, amount: true, paidById: true, status: true },
      },
      settlementRuns: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
    },
  });
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });
  if (!["CONFIRMED", "IN_PROGRESS", "SETTLING"].includes(event.status)) {
    return Response.json({ error: "現在は精算を確定できません。" }, { status: 409 });
  }
  if (event.participants.length === 0) {
    return Response.json({ error: "参加予定者が1名以上必要です。" }, { status: 400 });
  }
  if (event.expenses.some((expense) => expense.status === "SUBMITTED")) {
    return Response.json({ error: "未処理の立替申請を先に承認または却下してください。" }, { status: 409 });
  }

  const approvedExpenses = event.expenses.filter((expense) => expense.status === "APPROVED");
  if (approvedExpenses.length === 0) {
    return Response.json({ error: "承認済みの立替がありません。" }, { status: 400 });
  }

  const result = calculateEqualSettlement(
    approvedExpenses,
    event.participants.map((participant) => participant.id),
  );
  const now = new Date();
  const version = (event.settlementRuns[0]?.version ?? 0) + 1;
  const run = await db.$transaction(async (tx) => {
    await tx.settlementRun.updateMany({
      where: { eventId: event.id, status: "FINALIZED" },
      data: { status: "SUPERSEDED", supersededAt: now },
    });
    await tx.expenseSplit.deleteMany({
      where: { expenseId: { in: approvedExpenses.map((expense) => expense.id) } },
    });
    await tx.expenseSplit.createMany({ data: result.allocations });
    const created = await tx.settlementRun.create({
      data: {
        eventId: event.id,
        version,
        status: "FINALIZED",
        calculationPolicy: {
          type: "EQUAL",
          participantIds: event.participants.map((participant) => participant.id),
          rounding: "PARTICIPANT_ORDER",
        },
        totalExpense: result.totalExpense,
        finalizedAt: now,
        settlements: { create: result.transfers },
      },
      select: { id: true, version: true },
    });
    await tx.event.update({
      where: { id: event.id },
      data: { status: result.transfers.length === 0 ? "COMPLETED" : "SETTLING" },
    });
    return created;
  });

  return Response.json({ data: run }, { status: 201 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = settlementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "精算情報を確認してください。" }, { status: 400 });

  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const db = getPrisma();
  const settlement = await db.settlement.findFirst({
    where: {
      id: parsed.data.settlementId,
      status: "REPORTED_PAID",
      settlementRun: { eventId: id, status: "FINALIZED", event: { organizerId: user.id } },
    },
    select: { id: true, settlementRunId: true },
  });
  if (!settlement) return Response.json({ error: "支払報告が見つかりません。" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.settlement.update({
      where: { id: settlement.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    const remaining = await tx.settlement.count({
      where: { settlementRunId: settlement.settlementRunId, status: { not: "CONFIRMED" } },
    });
    if (remaining === 0) await tx.event.update({ where: { id }, data: { status: "COMPLETED" } });
  });

  return Response.json({ data: { id: settlement.id, status: "CONFIRMED" } });
}
