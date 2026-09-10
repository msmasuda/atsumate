import { cookies } from "next/headers";
import { z } from "zod";

import { getPrisma } from "@/lib/db";
import { hashGuestToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const voteSchema = z.object({
  votes: z
    .array(
      z.object({
        optionId: z.string().min(1),
        status: z.enum(["ATTENDING", "CONDITIONAL", "DECLINED"]),
        conditionNote: z.string().trim().max(120).optional(),
      }),
    )
    .min(1)
    .max(20)
    .refine((votes) => new Set(votes.map((vote) => vote.optionId)).size === votes.length),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "回答内容を確認してください。" }, { status: 400 });

  const db = getPrisma();
  const event = await db.event.findUnique({
    where: { inviteTokenHash: hashGuestToken(token) },
    select: { id: true, status: true },
  });
  if (!event || event.status !== "PLANNING") {
    return Response.json({ error: "この日程調整には回答できません。" }, { status: 404 });
  }

  const guestToken = (await cookies()).get(`atsumate_guest_${event.id}`)?.value;
  if (!guestToken) return Response.json({ error: "先に参加登録をしてください。" }, { status: 401 });

  const participant = await db.participant.findFirst({
    where: {
      eventId: event.id,
      guestTokenHash: hashGuestToken(guestToken),
      revokedAt: null,
    },
    select: { id: true },
  });
  if (!participant) return Response.json({ error: "参加情報を確認できません。" }, { status: 401 });

  const optionIds = parsed.data.votes.map((vote) => vote.optionId);
  if ((await db.eventDateOption.count({ where: { eventId: event.id, id: { in: optionIds } } })) !== optionIds.length) {
    return Response.json({ error: "候補日に無効な値が含まれています。" }, { status: 400 });
  }

  await db.$transaction(
    parsed.data.votes.map((vote) =>
      db.dateVote.upsert({
        where: { optionId_participantId: { optionId: vote.optionId, participantId: participant.id } },
        create: {
          optionId: vote.optionId,
          participantId: participant.id,
          status: vote.status,
          conditionNote: vote.status === "CONDITIONAL" ? vote.conditionNote || null : null,
        },
        update: {
          status: vote.status,
          conditionNote: vote.status === "CONDITIONAL" ? vote.conditionNote || null : null,
        },
      }),
    ),
  );

  const votes = await db.dateVote.findMany({
    where: { participantId: participant.id, option: { eventId: event.id } },
    select: { optionId: true, status: true, conditionNote: true },
  });
  return Response.json({ data: votes });
}
