import { describe, expect, it } from "vitest";

import { summarizeDateVotes } from "./date-votes";

describe("summarizeDateVotes", () => {
  it("回答状況と未回答者数を集計する", () => {
    expect(
      summarizeDateVotes(
        [
          { status: "ATTENDING" },
          { status: "ATTENDING" },
          { status: "CONDITIONAL" },
          { status: "DECLINED" },
        ],
        5,
      ),
    ).toEqual({ attending: 2, conditional: 1, declined: 1, unanswered: 1 });
  });
});
