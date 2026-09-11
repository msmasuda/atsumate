import { cookies } from "next/headers";
import { z } from "zod";

import { getPrisma } from "@/lib/db";
import { hashGuestToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const expenseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  amount: z.number().int().min(1).max(100_000_000),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const parsed = expenseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "内容と1円以上の金額を入力してください。" }, { status: 400 });

  const db = getPrisma();
  const event = await db.event.findUnique({
    where: { inviteTokenHash: hashGuestToken(token) },
    select: { id: true, status: true },
  });
  if (!event || !["CONFIRMED", "IN_PROGRESS", "SETTLING"].includes(event.status)) {
    return Response.json({ error: "現在は立替を申請できません。" }, { status: 409 });
  }

  const guestToken = (await cookies()).get(`atsumate_guest_${event.id}`)?.value;
  if (!guestToken) return Response.json({ error: "先に参加登録をしてください。" }, { status: 401 });

  const participant = await db.participant.findFirst({
    where: {
      eventId: event.id,
      guestTokenHash: hashGuestToken(guestToken),
      revokedAt: null,
      attendance: "ATTENDING",
    },
    select: { id: true },
  });
  if (!participant) return Response.json({ error: "参加予定の方だけ立替を申請できます。" }, { status: 403 });

  const expense = await db.expense.create({
    data: {
      eventId: event.id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      submittedById: participant.id,
      paidById: participant.id,
    },
    select: { id: true, title: true, amount: true, status: true, rejectionReason: true },
  });
  return Response.json({ data: expense }, { status: 201 });
}
