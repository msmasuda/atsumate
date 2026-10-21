import { describe, expect, it } from "vitest";

import { buildDateCalendar, parseAgentDateSuggestions } from "./agent-date-suggestions";

describe("buildDateCalendar", () => {
  it("タイムゾーンの日付から曜日付きの一覧を作る", () => {
    // UTCでは10/20だが東京では10/21(水)
    expect(buildDateCalendar(new Date("2026-10-20T16:00:00Z"), "Asia/Tokyo", 3)).toBe(
      "2026-10-21(水) 2026-10-22(木) 2026-10-23(金)",
    );
  });

  it("月をまたいでも曜日がずれない", () => {
    expect(buildDateCalendar(new Date("2026-10-21T03:00:00Z"), "Asia/Tokyo", 90)).toContain("2026-12-04(金)");
  });
});

describe("parseAgentDateSuggestions", () => {
  it("Markdownを含む応答から候補を取り出す", () => {
    expect(
      parseAgentDateSuggestions(`候補です。\n\`\`\`json\n[{"startAt":"2026-10-02T19:00:00+09:00","endAt":"2026-10-02T21:00:00+09:00","reason":"金曜夜"}]\n\`\`\``),
    ).toEqual([
      {
        startAt: "2026-10-02T19:00:00+09:00",
        endAt: "2026-10-02T21:00:00+09:00",
        reason: "金曜夜",
      },
    ]);
  });

  it("終了日時が開始日時以前の候補を拒否する", () => {
    expect(() =>
      parseAgentDateSuggestions('[{"startAt":"2026-10-02T21:00:00+09:00","endAt":"2026-10-02T19:00:00+09:00","reason":"不正"}]'),
    ).toThrow("終了日時が開始日時以前の候補があります。");
  });
});
