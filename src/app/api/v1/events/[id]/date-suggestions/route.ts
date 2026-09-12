import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { requestAgentDateSuggestions } from "@/lib/agent-date-suggestions";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 200;

const requestSchema = z.object({ request: z.string().trim().min(1).max(500) });

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "日程の希望を500文字以内で入力してください。" }, { status: 400 });

  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const event = await getPrisma().event.findFirst({
    where: { id, organizerId: user.id },
    select: { title: true, timezone: true, status: true },
  });
  if (!event) return Response.json({ error: "イベントが見つかりません。" }, { status: 404 });
  if (event.status !== "PLANNING") {
    return Response.json({ error: "日程確定後はAI候補を作成できません。" }, { status: 409 });
  }

  try {
    const suggestions = await requestAgentDateSuggestions({
      eventTitle: event.title,
      timeZone: event.timezone,
      request: parsed.data.request,
    });
    return Response.json({ data: suggestions });
  } catch (error) {
    console.error("agent.date_suggestions.failed", error);
    return Response.json({ error: "AIから日程候補を取得できませんでした。時間をおいてお試しください。" }, { status: 503 });
  }
}
