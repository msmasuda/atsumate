import { z } from "zod";

const conversationSchema = z.object({ id: z.uuid() });
const messageSchema = z.object({ content: z.string() });
const toolCompletedSchema = z.object({ name: z.string(), output: z.string() });

function agentHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.AGENT_API_TOKEN) headers.Authorization = `Bearer ${process.env.AGENT_API_TOKEN}`;
  return headers;
}

function agentBaseUrl() {
  const baseUrl = process.env.AGENT_API_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("AGENT_API_URLが設定されていません。");
  return baseUrl;
}

async function createConversation(baseUrl: string, headers: Record<string, string>, title: string) {
  const response = await fetch(`${baseUrl}/v1/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`会話を開始できませんでした（${response.status}）。`);
  return conversationSchema.parse(await response.json());
}

async function deleteConversation(baseUrl: string, headers: Record<string, string>, id: string) {
  await fetch(`${baseUrl}/v1/conversations/${id}`, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
}

export function parseAgentSseEvent(block: string) {
  let event = "";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trimStart();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return event ? { event, data: data.join("\n") } : null;
}

export async function requestAgentMessage(title: string, prompt: string) {
  const baseUrl = agentBaseUrl();
  const headers = agentHeaders();
  const conversation = await createConversation(baseUrl, headers, title);

  try {
    const messageResponse = await fetch(`${baseUrl}/v1/conversations/${conversation.id}/messages`, {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ content: prompt }),
      signal: AbortSignal.timeout(190_000),
    });
    if (!messageResponse.ok) throw new Error(`エージェントから回答を取得できませんでした（${messageResponse.status}）。`);
    return messageSchema.parse(await messageResponse.json()).content;
  } finally {
    await deleteConversation(baseUrl, headers, conversation.id);
  }
}

export async function requestAgentToolOutput(title: string, prompt: string, toolName: string) {
  const baseUrl = agentBaseUrl();
  const headers = agentHeaders();
  const conversation = await createConversation(baseUrl, headers, title);

  try {
    const response = await fetch(`${baseUrl}/v1/conversations/${conversation.id}/messages/stream`, {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ content: prompt }),
      signal: AbortSignal.timeout(150_000),
    });
    if (!response.ok || !response.body) {
      throw new Error(`エージェントから検索結果を取得できませんでした（${response.status}）。`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output: string | undefined;
    let cancelRequested = false;

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const parsed = parseAgentSseEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        if (parsed?.event === "tool.completed") {
          const tool = toolCompletedSchema.parse(JSON.parse(parsed.data));
          if (tool.name === toolName) output = tool.output;
          if (output && !cancelRequested) {
            cancelRequested = true;
            await fetch(`${baseUrl}/v1/conversations/${conversation.id}/cancel`, {
              method: "POST",
              headers,
              signal: AbortSignal.timeout(10_000),
            });
          }
        }
        if (parsed?.event === "message.completed" || parsed?.event === "message.failed") {
          if (output) return output;
          throw new Error("エージェントがWeb検索結果を返しませんでした。");
        }
      }

      if (done) break;
    }

    if (!output) throw new Error("エージェントがWeb検索結果を返しませんでした。");
    return output;
  } finally {
    await deleteConversation(baseUrl, headers, conversation.id);
  }
}
