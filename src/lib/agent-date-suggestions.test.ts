import { describe, expect, it } from "vitest";

import { parseAgentDateSuggestions } from "./agent-date-suggestions";

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
