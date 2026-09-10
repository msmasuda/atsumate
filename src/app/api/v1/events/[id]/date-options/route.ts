import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

const createSchema = z.object({
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime().optional(),
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
  if (event.status !== "PLANNING") {
    return Response.json({ error: "確定済みの日程には候補を追加できません。" }, { status: 409 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "候補日時を確認してください。" }, { status: 400 });
  }

  const startAt = new Date(parsed.data.startAt);
  const endAt = parsed.data.endAt ? new Date(parsed.data.endAt) : null;
  if (endAt && endAt <= startAt) {
    return Response.json({ error: "終了日時は開始日時より後にしてください。" }, { status: 400 });
  }

  const db = getPrisma();
  if ((await db.eventDateOption.count({ where: { eventId: event.id } })) >= 20) {
    return Response.json({ error: "候補日は20件まで登録できます。" }, { status: 400 });
  }
  if (await db.eventDateOption.findUnique({ where: { eventId_startAt: { eventId: event.id, startAt } } })) {
    return Response.json({ error: "同じ開始日時の候補が既にあります。" }, { status: 409 });
  }

  const option = await db.eventDateOption.create({
    data: { eventId: event.id, startAt, endAt },
  });
  return Response.json({ data: option }, { status: 201 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = await getOrganizerEvent(request, id);
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });

  const parsed = optionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "候補日を選択してください。" }, { status: 400 });

  const db = getPrisma();
  const option = await db.eventDateOption.findFirst({
    where: { id: parsed.data.optionId, eventId: event.id },
    select: { id: true, startAt: true },
  });
  if (!option) return Response.json({ error: "候補日が見つかりません。" }, { status: 404 });

  await db.$transaction([
    db.eventDateOption.updateMany({ where: { eventId: event.id }, data: { isDecided: false } }),
    db.eventDateOption.update({ where: { id: option.id }, data: { isDecided: true } }),
    db.event.update({
      where: { id: event.id },
      data: { eventDate: option.startAt, status: "CONFIRMED" },
    }),
  ]);
  return Response.json({ data: { optionId: option.id, eventDate: option.startAt } });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = await getOrganizerEvent(request, id);
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });
  if (event.status !== "PLANNING") {
    return Response.json({ error: "確定済みの日程候補は削除できません。" }, { status: 409 });
  }

  const parsed = optionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "候補日を選択してください。" }, { status: 400 });

  const deleted = await getPrisma().eventDateOption.deleteMany({
    where: { id: parsed.data.optionId, eventId: event.id },
  });
  if (deleted.count === 0) return Response.json({ error: "候補日が見つかりません。" }, { status: 404 });

  return Response.json({ data: { optionId: parsed.data.optionId } });
}
