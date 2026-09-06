import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { createOpaqueToken, hashGuestToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const createEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000).optional(),
  responseDueAt: z.iso.datetime().optional(),
});

async function requireOrganizer() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return null;

  const db = getPrisma();
  return db.user.upsert({
    where: { oidcSubject: session.user.id },
    update: { name: session.user.name, email: session.user.email },
    create: {
      oidcSubject: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  });
}

export async function GET() {
  const organizer = await requireOrganizer();
  if (!organizer) return Response.json({ error: "認証が必要です。" }, { status: 401 });

  const events = await getPrisma().event.findMany({
    where: { organizerId: organizer.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { participants: true } } },
  });
  return Response.json({ data: events });
}

export async function POST(request: Request) {
  const organizer = await requireOrganizer();
  if (!organizer) return Response.json({ error: "認証が必要です。" }, { status: 401 });

  const parsed = createEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "入力内容を確認してください。", details: parsed.error.flatten() }, { status: 400 });
  }

  const inviteToken = createOpaqueToken();
  const event = await getPrisma().event.create({
    data: {
      ...parsed.data,
      responseDueAt: parsed.data.responseDueAt ? new Date(parsed.data.responseDueAt) : undefined,
      publicSlug: createOpaqueToken(12),
      inviteTokenHash: hashGuestToken(inviteToken),
      organizerId: organizer.id,
    },
    select: {
      id: true,
      title: true,
      publicSlug: true,
      status: true,
      timezone: true,
      currency: true,
      createdAt: true,
    },
  });

  return Response.json(
    { data: event, inviteUrl: `/invite/${inviteToken}` },
    { status: 201 },
  );
}
