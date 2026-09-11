import { describe, expect, it } from "vitest";

import { parseAgentVenueSearchResults } from "./agent-venue-suggestions";

describe("parseAgentVenueSearchResults", () => {
  it("Web検索結果を参考候補として読み取る", () => {
    expect(
      parseAgentVenueSearchResults("【Web検索結果: '新宿 個室']\n\n[1] 新宿の個室居酒屋まとめ\nURL: https://example.com/a\n概要: 条件に合う店舗を紹介しています。"),
    ).toEqual([
      {
        name: "新宿の個室居酒屋まとめ",
        url: "https://example.com/a",
        courseTitle: undefined,
        pricePerPerson: undefined,
        features: "条件に合う店舗を紹介しています。",
        recommendation: "Web検索で見つかった参考候補です。詳細はリンク先で確認してください。",
      },
    ]);
  });

  it("不正なURLを拒否する", () => {
    expect(() => parseAgentVenueSearchResults("[1] 居酒屋A\nURL: not-a-url\n概要: 個室あり")).toThrow();
  });
});
