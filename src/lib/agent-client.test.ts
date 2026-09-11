import { describe, expect, it } from "vitest";

import { parseAgentSseEvent } from "./agent-client";

describe("parseAgentSseEvent", () => {
  it("tool.completedイベントを読み取る", () => {
    expect(parseAgentSseEvent('id: 1\nevent: tool.completed\ndata: {"name":"web_search","output":"結果"}')).toEqual({
      event: "tool.completed",
      data: '{"name":"web_search","output":"結果"}',
    });
  });
});
