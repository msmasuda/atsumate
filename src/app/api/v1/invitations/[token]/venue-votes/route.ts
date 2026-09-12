import { cookies } from "next/headers";
import { z } from "zod";

import { getPrisma } from "@/lib/db";
import { hashGuestToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const voteSchema = z.object({ venueId: z.string().min(1) });

type RouteContext = { params: Promise<{ token: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "店舗を選択してください。" }, { status: 400 });

  const db = getPrisma();
  const event = await db.event.findUnique({
    where: { inviteTokenHash: hashGuestToken(token) },
    select: { id: true, status: true, venueOptions: { where: { isDecided: true }, select: { id: true }, take: 1 } },
  });
  if (!event || !["PLANNING", "CONFIRMED"].includes(event.status)) {
    return Response.json({ error: "この店舗投票には回答できません。" }, { status: 404 });
  }
  if (event.venueOptions.length > 0) {
    return Response.json({ error: "店舗はすでに決定しています。" }, { status: 409 });
  }

  const guestToken = (await cookies()).get(`atsumate_guest_${event.id}`)?.value;
  if (!guestToken) return Response.json({ error: "先に参加登録をしてください。" }, { status: 401 });

  const participant = await db.participant.findFirst({
    where: { eventId: event.id, guestTokenHash: hashGuestToken(guestToken), revokedAt: null },
    select: { id: true },
  });
  if (!participant) return Response.json({ error: "参加情報を確認できません。" }, { status: 401 });

  const venue = await db.venueOption.findFirst({
    where: { id: parsed.data.venueId, eventId: event.id },
    select: { id: true },
  });
  if (!venue) return Response.json({ error: "店舗候補が見つかりません。" }, { status: 400 });

  await db.$transaction([
    db.venueVote.deleteMany({ where: { participantId: participant.id, venue: { eventId: event.id } } }),
    db.venueVote.create({ data: { participantId: participant.id, venueId: venue.id } }),
  ]);
  return Response.json({ data: { venueId: venue.id } });
}
