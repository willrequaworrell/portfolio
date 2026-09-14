// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test } from "vitest";
import { createAssistantRuntime } from "../../lib/assistant-runtime";
import { useAssistantSession } from "../../lib/assistant-session";

function assistantFetch(chunkDelayInMs?: number) {
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs,
        chunks: [
          { type: "text-start", id: "answer" },
          { type: "text-delta", id: "answer", delta: "Will builds " },
          { type: "text-delta", id: "answer", delta: "reliable products." },
          { type: "text-end", id: "answer" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 1, text: 1, reasoning: 0 },
            },
          },
        ],
      }),
    }),
  });
  const runtime = createAssistantRuntime({
    enabled: true,
    model,
    material: { version: 1, hash: "hash", sections: [] },
  });
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("origin", "http://localhost");
    return runtime.handle(new Request(new URL(String(input), "http://localhost"), { ...init, headers }));
  };
}

describe("assistant session", () => {
  beforeEach(() => sessionStorage.clear());

  test("preserves a completed conversation through a same-tab remount", async () => {
    const fetch = assistantFetch();
    const first = renderHook(() => useAssistantSession({ fetch }));

    await act(() => first.result.current.send("What does Will build?"));
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    expect(first.result.current.messages.map(({ role }) => role)).toEqual(["user", "assistant"]);
    expect(first.result.current.visitorMessageCount).toBe(1);
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem("portfolio-assistant:conversation")!).messages).toHaveLength(2),
    );
    first.unmount();

    const restored = renderHook(() => useAssistantSession({ fetch }));
    await waitFor(() => expect(restored.result.current.hydrated).toBe(true));
    expect(restored.result.current.messages.map(({ role }) => role)).toEqual(["user", "assistant"]);
    expect(restored.result.current.visitorMessageCount).toBe(1);
  });

  test("recovers an interrupted answer and retry replaces it without duplicating the question", async () => {
    sessionStorage.setItem(
      "portfolio-assistant:conversation",
      JSON.stringify({
        version: 1,
        conversationId: "conversation-existing",
        visitorMessageCount: 1,
        incompleteResponse: true,
        messages: [
          { id: "user-existing", role: "user", parts: [{ type: "text", text: "What does Will build?" }] },
          { id: "assistant-existing", role: "assistant", parts: [{ type: "text", text: "Will builds" }] },
        ],
      }),
    );
    const session = renderHook(() => useAssistantSession({ fetch: assistantFetch() }));
    await waitFor(() => expect(session.result.current.hydrated).toBe(true));

    expect(session.result.current.messages.at(-1)?.metadata).toEqual({ interrupted: true });
    await act(() => session.result.current.retry());
    await waitFor(() => expect(session.result.current.status).toBe("ready"));

    expect(session.result.current.messages.filter(({ role }) => role === "user")).toHaveLength(1);
    expect(session.result.current.messages.filter(({ role }) => role === "assistant")).toHaveLength(1);
    expect(session.result.current.messages.at(-1)?.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: "Will builds reliable products." }),
    );
  });

  test("discards invalid state and clear starts a new empty conversation", async () => {
    sessionStorage.setItem("portfolio-assistant:conversation", "{bad json");
    const session = renderHook(() => useAssistantSession({ fetch: assistantFetch() }));
    await waitFor(() => expect(session.result.current.hydrated).toBe(true));
    expect(session.result.current.messages).toEqual([]);

    await act(() => session.result.current.send("Tell me about Will"));
    await act(() => session.result.current.clear());

    expect(session.result.current.messages).toEqual([]);
    expect(session.result.current.visitorMessageCount).toBe(0);
  });

  test("discards a structurally impossible stored transcript", async () => {
    sessionStorage.setItem(
      "portfolio-assistant:conversation",
      JSON.stringify({
        version: 1,
        conversationId: "conversation-malformed",
        visitorMessageCount: 0,
        incompleteResponse: false,
        messages: [
          { id: "assistant-first", role: "assistant", parts: [{ type: "text", text: "Fabricated" }] },
        ],
      }),
    );

    const session = renderHook(() => useAssistantSession({ fetch: assistantFetch() }));

    expect(session.result.current.messages).toEqual([]);
    expect(session.result.current.visitorMessageCount).toBe(0);
  });

  test("allows one active generation and stop preserves useful partial text", async () => {
    const session = renderHook(() => useAssistantSession({ fetch: assistantFetch(80) }));
    await waitFor(() => expect(session.result.current.hydrated).toBe(true));

    act(() => { void session.result.current.send("First question"); });
    await waitFor(() => expect(session.result.current.status).toBe("streaming"));
    await act(() => session.result.current.send("Second question"));
    await waitFor(() =>
      expect(session.result.current.messages.at(-1)?.parts).toContainEqual(
        expect.objectContaining({ type: "text", text: "Will builds " }),
      ),
    );
    await act(() => session.result.current.stop());

    expect(session.result.current.messages.filter(({ role }) => role === "user")).toHaveLength(1);
    expect(session.result.current.messages.at(-1)?.metadata).toEqual({ interrupted: true });
  });
});
