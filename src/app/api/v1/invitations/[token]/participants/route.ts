import { cookies } from "next/headers";
import { z } from "zod";

import { getPrisma } from "@/lib/db";
import { createOpaqueToken, hashGuestToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const joinSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().optional(),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token: inviteToken } = await context.params;
  const parsed = joinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "名前を入力してください。" }, { status: 400 });

  const db = getPrisma();
  const event = await db.event.findUnique({
    where: { inviteTokenHash: hashGuestToken(inviteToken) },
    select: { id: true, status: true },
  });
  if (!event || event.status === "CANCELLED" || event.status === "COMPLETED") {
    return Response.json({ error: "この招待は利用できません。" }, { status: 404 });
  }

  const guestToken = createOpaqueToken();
  const participant = await db.participant.create({
    data: {
      eventId: event.id,
      name: parsed.data.name,
      email: parsed.data.email,
      guestTokenHash: hashGuestToken(guestToken),
    },
    select: { id: true, name: true, attendance: true },
  });

  const cookieStore = await cookies();
  cookieStore.set(`atsumate_guest_${event.id}`, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return Response.json({ data: participant }, { status: 201 });
}
