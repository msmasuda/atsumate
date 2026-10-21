import { z } from "zod";

import { requestAgentMessage } from "./agent-client";

const suggestionSchema = z.object({
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }).optional(),
  reason: z.string().trim().min(1).max(120),
});

export type AgentDateSuggestion = z.infer<typeof suggestionSchema>;

export function parseAgentDateSuggestions(content: string): AgentDateSuggestion[] {
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("日程候補のJSON配列がありません。");

  const parsed = z.array(suggestionSchema).min(1).max(5).parse(JSON.parse(content.slice(start, end + 1)));
  const unique = parsed.filter(
    (suggestion, index) => parsed.findIndex((item) => item.startAt === suggestion.startAt) === index,
  );
  if (unique.some((suggestion) => suggestion.endAt && new Date(suggestion.endAt) <= new Date(suggestion.startAt))) {
    throw new Error("終了日時が開始日時以前の候補があります。");
  }
  return unique;
}

// エージェントがツールで曜日を調べてループしないよう、日付と曜日の一覧を渡す
export function buildDateCalendar(now: Date, timeZone: string, days = 90) {
  const [year, month, day] = now.toLocaleDateString("sv-SE", { timeZone }).split("-").map(Number);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1, day + i));
    const weekday = date.toLocaleDateString("ja-JP", { timeZone: "UTC", weekday: "short" });
    return `${date.toISOString().slice(0, 10)}(${weekday})`;
  }).join(" ");
}

export async function requestAgentDateSuggestions(input: {
  eventTitle: string;
  timeZone: string;
  request: string;
}) {
  const now = new Date();
  const prompt = [
    `現在日時は${now.toISOString()}、イベント名は「${input.eventTitle}」、タイムゾーンは${input.timeZone}です。`,
    `日程の希望: ${input.request}`,
    `今日からの日付と曜日: ${buildDateCalendar(now, input.timeZone)}`,
    "Web検索や計算などのツールは使わず、与えられた情報だけで回答してください。",
    "希望に合う現実的な候補を3件提案してください。説明文やMarkdownを付けず、",
    '[{"startAt":"タイムゾーンオフセット付きISO 8601","endAt":"タイムゾーンオフセット付きISO 8601","reason":"短い理由"}]',
    "形式のJSON配列だけを返してください。終了日時を判断できない場合はendAtを省略してください。",
  ].join("\n");

  // ponytail: エージェントの応答がぶれるため1回だけ再試行。langgraph_sample#37 が直れば外せる
  try {
    return parseAgentDateSuggestions(await requestAgentMessage(`${input.eventTitle}の日程候補`, prompt));
  } catch (error) {
    console.warn("agent.date_suggestions.retry", error);
    return parseAgentDateSuggestions(await requestAgentMessage(`${input.eventTitle}の日程候補`, prompt));
  }
}
