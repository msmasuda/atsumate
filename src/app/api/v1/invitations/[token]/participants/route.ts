import { cookies } from "next/headers";
import { z } from "zod";

import { getPrisma } from "@/lib/db";
import { createOpaqueToken, hashGuestToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const joinSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().optional(),
  dietaryRequirements: z.string().trim().min(1).max(300).optional(),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token: inviteToken } = await context.params;
  const parsed = joinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "名前を入力してください。" }, { status: 400 });

  const db = getPrisma();
  const participantSelect = {
    id: true,
    name: true,
    attendance: true,
    venueVotes: { select: { venueId: true } },
    dateVotes: { select: { optionId: true, status: true, conditionNote: true } },
    expensesSubmitted: {
      orderBy: { createdAt: "desc" as const },
      select: { id: true, title: true, amount: true, status: true, rejectionReason: true },
    },
    settlementsToPay: {
      where: { settlementRun: { status: "FINALIZED" as const } },
      select: { id: true, amount: true, status: true, to: { select: { name: true } } },
    },
    settlementsToReceive: {
      where: { settlementRun: { status: "FINALIZED" as const } },
      select: { id: true, amount: true, status: true, from: { select: { name: true } } },
    },
  } as const;
  const event = await db.event.findUnique({
    where: { inviteTokenHash: hashGuestToken(inviteToken) },
    select: { id: true, status: true },
  });
  if (!event || !["PLANNING", "CONFIRMED", "IN_PROGRESS"].includes(event.status)) {
    return Response.json({ error: "この招待は利用できません。" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cookieName = `atsumate_guest_${event.id}`;
  const existingGuestToken = cookieStore.get(cookieName)?.value;
  if (existingGuestToken) {
    const existingParticipant = await db.participant.findFirst({
      where: {
        eventId: event.id,
        guestTokenHash: hashGuestToken(existingGuestToken),
        revokedAt: null,
      },
      select: participantSelect,
    });
    if (existingParticipant) {
      return Response.json({ data: existingParticipant });
    }
  }

  const guestToken = createOpaqueToken();
  const participant = await db.participant.create({
    data: {
      eventId: event.id,
      name: parsed.data.name,
      email: parsed.data.email,
      dietaryRequirements: parsed.data.dietaryRequirements,
      guestTokenHash: hashGuestToken(guestToken),
    },
    select: participantSelect,
  });

  cookieStore.set(cookieName, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return Response.json({ data: participant }, { status: 201 });
}
