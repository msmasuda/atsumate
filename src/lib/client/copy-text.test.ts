import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText } from "./copy-text";

function stubFallback(copySucceeded = true) {
  const textarea = {
    value: "",
    setAttribute: vi.fn(),
    style: {} as CSSStyleDeclaration,
    select: vi.fn(),
    remove: vi.fn(),
  };
  const appendChild = vi.fn();
  const execCommand = vi.fn(() => copySucceeded);

  vi.stubGlobal("document", {
    createElement: vi.fn(() => textarea),
    body: { appendChild },
    execCommand,
  });

  return { textarea, appendChild, execCommand };
}

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Clipboard APIが使える場合はwriteTextを使用する", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await copyText("https://example.com/invite/abc");

    expect(writeText).toHaveBeenCalledWith("https://example.com/invite/abc");
  });

  it("Clipboard APIがない場合は一時要素を使用する", async () => {
    vi.stubGlobal("navigator", {});
    const { textarea, appendChild, execCommand } = stubFallback();

    await copyText("http://192.168.100.56:3000/invite/abc");

    expect(textarea.value).toBe("http://192.168.100.56:3000/invite/abc");
    expect(appendChild).toHaveBeenCalledWith(textarea);
    expect(textarea.select).toHaveBeenCalledOnce();
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(textarea.remove).toHaveBeenCalledOnce();
  });

  it("Clipboard APIが拒否された場合もフォールバックする", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Not allowed"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { execCommand } = stubFallback();

    await copyText("https://example.com/invite/abc");

    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
