import { z } from "zod";

import { requestAgentVenueSuggestions } from "@/lib/agent-venue-suggestions";
import { getAuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 200;

const requestSchema = z.object({ request: z.string().trim().min(1).max(500) });

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "店舗の希望を500文字以内で入力してください。" }, { status: 400 });

  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const event = await getPrisma().event.findFirst({
    where: { id, organizerId: user.id },
    select: {
      title: true,
      eventDate: true,
      status: true,
      participants: {
        where: { revokedAt: null },
        select: { dietaryRequirements: true },
      },
    },
  });
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });
  if (!["PLANNING", "CONFIRMED"].includes(event.status)) {
    return Response.json({ error: "現在のイベント状態では店舗を検索できません。" }, { status: 409 });
  }

  try {
    const suggestions = await requestAgentVenueSuggestions({
      eventTitle: event.title,
      eventDate: event.eventDate?.toISOString() ?? null,
      headcount: event.participants.length,
      dietaryRequirements: event.participants.flatMap((participant) =>
        participant.dietaryRequirements ? [participant.dietaryRequirements] : [],
      ),
      request: parsed.data.request,
    });
    return Response.json({ data: suggestions });
  } catch (error) {
    console.error("agent.venue_suggestions.failed", error);
    return Response.json({ error: "AIから店舗候補を取得できませんでした。時間をおいてお試しください。" }, { status: 503 });
  }
}
