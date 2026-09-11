import { z } from "zod";

import { requestAgentToolOutput } from "./agent-client";

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional().transform((value) => value ?? undefined);
const suggestionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().url().max(2048).nullable().optional().transform((value) => value ?? undefined),
  courseTitle: optionalText(160),
  pricePerPerson: z.number().int().positive().max(1_000_000).nullable().optional().transform((value) => value ?? undefined),
  features: optionalText(300),
  recommendation: optionalText(300),
});

export type AgentVenueSuggestion = z.infer<typeof suggestionSchema>;

export function parseAgentVenueSearchResults(content: string): AgentVenueSuggestion[] {
  // ponytail: 検索結果ページを候補として扱う暫定版。個別店舗の構造化回答が安定したら置き換える。
  const matches = content.matchAll(/^\[\d+\]\s+(.+)\r?\nURL:\s*(\S+)\r?\n概要:\s*(.+)$/gm);
  const suggestions = [...matches].flatMap((match) => {
    const parsed = suggestionSchema.safeParse({
      name: match[1].trim().slice(0, 120),
      url: match[2],
      features: match[3].trim().slice(0, 300),
      recommendation: "Web検索で見つかった参考候補です。詳細はリンク先で確認してください。",
    });
    return parsed.success ? [parsed.data] : [];
  });
  const unique = suggestions.filter(
    (suggestion, index) => suggestions.findIndex((item) => item.url === suggestion.url) === index,
  ).slice(0, 3);
  if (unique.length === 0) throw new Error("Web検索結果を読み取れませんでした。");
  return unique;
}

export async function requestAgentVenueSuggestions(input: {
  eventTitle: string;
  eventDate: string | null;
  headcount: number;
  dietaryRequirements: string[];
  request: string;
}) {
  const prompt = [
    `現在日時は${new Date().toISOString()}、イベント名は「${input.eventTitle}」です。`,
    `開催日時: ${input.eventDate ?? "未定"}、現在の参加登録人数: ${input.headcount}名`,
    `参加者の食事要望: ${input.dietaryRequirements.join("、") || "なし"}`,
    `店舗の希望: ${input.request}`,
    "条件に合う店舗情報を探すため、web_searchを必ず1回だけ使ってください。",
  ].join("\n");
  const results = await requestAgentToolOutput(`${input.eventTitle}の店舗候補`, prompt, "web_search");
  return parseAgentVenueSearchResults(results);
}
