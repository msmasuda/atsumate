import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

const expenseSchema = z.object({
  expenseId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = expenseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "立替申請を確認してください。" }, { status: 400 });

  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const db = getPrisma();
  const expense = await db.expense.findFirst({
    where: { id: parsed.data.expenseId, eventId: id, event: { organizerId: user.id } },
    select: { id: true, status: true, event: { select: { status: true } } },
  });
  if (!expense) return Response.json({ error: "立替申請が見つかりません。" }, { status: 404 });
  if (["COMPLETED", "CANCELLED"].includes(expense.event.status)) {
    return Response.json({ error: "終了したイベントの立替申請は変更できません。" }, { status: 409 });
  }
  if (expense.status !== "SUBMITTED") {
    return Response.json({ error: "この立替申請は処理済みです。" }, { status: 409 });
  }

  const approved = parsed.data.status === "APPROVED";
  const updated = await db.expense.update({
    where: { id: expense.id },
    data: approved
      ? { status: "APPROVED", approvedById: user.id, approvedAt: new Date() }
      : { status: "REJECTED", rejectedAt: new Date() },
    select: { id: true, status: true },
  });
  return Response.json({ data: updated });
}
