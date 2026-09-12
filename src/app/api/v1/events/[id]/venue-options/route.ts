import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

const venueSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().url().max(2048).optional(),
  courseTitle: z.string().trim().min(1).max(160).optional(),
  pricePerPerson: z.number().int().positive().max(1_000_000).optional(),
  features: z.string().trim().min(1).max(300).optional(),
  recommendation: z.string().trim().min(1).max(300).optional(),
});
const optionSchema = z.object({ optionId: z.string().min(1) });

type RouteContext = { params: Promise<{ id: string }> };

async function getOrganizerEvent(request: Request, id: string) {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;
  return getPrisma().event.findFirst({
    where: { id, organizerId: user.id },
    select: { id: true, status: true },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = await getOrganizerEvent(request, id);
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });
  if (!["PLANNING", "CONFIRMED"].includes(event.status)) {
    return Response.json({ error: "現在のイベント状態では店舗候補を追加できません。" }, { status: 409 });
  }

  const parsed = venueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "店舗候補の内容を確認してください。" }, { status: 400 });

  const db = getPrisma();
  if ((await db.venueOption.count({ where: { eventId: event.id } })) >= 20) {
    return Response.json({ error: "店舗候補は20件まで登録できます。" }, { status: 400 });
  }
  const option = await db.venueOption.create({ data: { eventId: event.id, ...parsed.data } });
  return Response.json({ data: option }, { status: 201 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = await getOrganizerEvent(request, id);
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });
  if (!["PLANNING", "CONFIRMED"].includes(event.status)) {
    return Response.json({ error: "現在のイベント状態では店舗を決定できません。" }, { status: 409 });
  }

  const parsed = optionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "店舗候補を選択してください。" }, { status: 400 });

  const db = getPrisma();
  const option = await db.venueOption.findFirst({
    where: { id: parsed.data.optionId, eventId: event.id },
    select: { id: true },
  });
  if (!option) return Response.json({ error: "店舗候補が見つかりません。" }, { status: 404 });

  await db.$transaction([
    db.venueOption.updateMany({ where: { eventId: event.id }, data: { isDecided: false } }),
    db.venueOption.update({ where: { id: option.id }, data: { isDecided: true } }),
  ]);
  return Response.json({ data: { optionId: option.id } });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = await getOrganizerEvent(request, id);
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });

  const parsed = optionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "店舗候補を選択してください。" }, { status: 400 });

  const deleted = await getPrisma().venueOption.deleteMany({
    where: { id: parsed.data.optionId, eventId: event.id, isDecided: false },
  });
  if (deleted.count === 0) return Response.json({ error: "店舗候補が見つからないか、決定済みです。" }, { status: 404 });
  return Response.json({ data: { optionId: parsed.data.optionId } });
}
