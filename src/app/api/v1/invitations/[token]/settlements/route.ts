import { cookies } from "next/headers";
import { z } from "zod";

import { getPrisma } from "@/lib/db";
import { hashGuestToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const settlementSchema = z.object({ settlementId: z.string().min(1) });

type RouteContext = { params: Promise<{ token: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const parsed = settlementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "精算情報を確認してください。" }, { status: 400 });

  const db = getPrisma();
  const event = await db.event.findUnique({
    where: { inviteTokenHash: hashGuestToken(token) },
    select: { id: true, status: true },
  });
  if (!event || !["SETTLING", "COMPLETED"].includes(event.status)) {
    return Response.json({ error: "精算はまだ開始されていません。" }, { status: 409 });
  }

  const guestToken = (await cookies()).get(`atsumate_guest_${event.id}`)?.value;
  if (!guestToken) return Response.json({ error: "参加情報を確認できません。" }, { status: 401 });

  const participant = await db.participant.findFirst({
    where: { eventId: event.id, guestTokenHash: hashGuestToken(guestToken), revokedAt: null },
    select: { id: true },
  });
  if (!participant) return Response.json({ error: "参加情報を確認できません。" }, { status: 401 });

  const settlement = await db.settlement.findFirst({
    where: {
      id: parsed.data.settlementId,
      fromId: participant.id,
      settlementRun: { eventId: event.id, status: "FINALIZED" },
    },
    select: { id: true, status: true },
  });
  if (!settlement) return Response.json({ error: "精算情報が見つかりません。" }, { status: 404 });
  if (settlement.status === "CONFIRMED") {
    return Response.json({ error: "この支払いは確認済みです。" }, { status: 409 });
  }

  const updated = await db.settlement.update({
    where: { id: settlement.id },
    data: { status: "REPORTED_PAID", reportedPaidAt: new Date() },
    select: { id: true, status: true },
  });
  return Response.json({ data: updated });
}
