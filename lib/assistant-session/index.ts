"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

const storageKey = "portfolio-assistant:conversation";
const storedIdentifierSchema = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);
const storedTextPart = (maximum: number) =>
  z.object({ type: z.literal("text"), text: z.string().min(1).max(maximum) }).strict();
const storedMetadataSchema = z
  .object({ interrupted: z.literal(true).optional() })
  .strict()
  .optional();
const storedMessageSchema = z.discriminatedUnion("role", [
  z
    .object({
      id: storedIdentifierSchema,
      role: z.literal("user"),
      parts: z.array(storedTextPart(2_000)).length(1),
      metadata: storedMetadataSchema,
    })
    .strict(),
  z
    .object({
      id: storedIdentifierSchema,
      role: z.literal("assistant"),
      parts: z.array(storedTextPart(8_000)).length(1),
      metadata: storedMetadataSchema,
    })
    .strict(),
]);
const storedSessionSchema = z
  .object({
    version: z.literal(1),
    conversationId: storedIdentifierSchema,
    messages: z.array(storedMessageSchema).max(80),
    visitorMessageCount: z.number().int().min(0).max(40),
    incompleteResponse: z.boolean(),
  })
  .strict()
  .refine(
    ({ messages, visitorMessageCount }) =>
      messages.filter(({ role }) => role === "user").length === visitorMessageCount,
    { message: "Stored visitor count does not match the conversation." },
  )
  .refine(
    ({ messages }) =>
      messages.every(
        (message, index) => message.role === (index % 2 === 0 ? "user" : "assistant"),
      ),
    { message: "Stored messages are not a valid conversation." },
  )
  .refine(
    ({ messages }) => new Set(messages.map(({ id }) => id)).size === messages.length,
    { message: "Stored message IDs must be unique." },
  )
  .refine(
    ({ incompleteResponse, messages }) =>
      !incompleteResponse || messages.at(-1)?.role === "assistant",
    { message: "An incomplete stored response must contain a partial answer." },
  );

type AssistantMessage = UIMessage<{ interrupted?: boolean }>;
type AssistantFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function createId(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${value}`;
}

function initialSession() {
  const fresh = { conversationId: createId("conversation"), messages: [] as AssistantMessage[] };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return fresh;
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      sessionStorage.removeItem(storageKey);
      return fresh;
    }
    return {
      conversationId: parsed.data.conversationId,
      messages: parsed.data.messages.map((message, index, messages) =>
        parsed.data.incompleteResponse && index === messages.length - 1 && message.role === "assistant"
          ? { ...message, metadata: { ...message.metadata, interrupted: true } }
          : { ...message },
      ),
    };
  } catch {
    sessionStorage.removeItem(storageKey);
    return fresh;
  }
}

function textOnlyMessages(messages: AssistantMessage[]) {
  return messages.map(({ id, role, parts, metadata }) => ({
    id,
    role,
    parts: parts
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map(({ type, text }) => ({ type, text })),
    ...(metadata?.interrupted ? { metadata: { interrupted: true } } : {}),
  }));
}

function messagesForRequest(messages: AssistantMessage[]) {
  return textOnlyMessages(messages).map(({ id, role, parts }) => ({ id, role, parts }));
}

function markPartialInterrupted(messages: AssistantMessage[]) {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant" || last.metadata?.interrupted) return messages;
  return [
    ...messages.slice(0, -1),
    { ...last, metadata: { ...last.metadata, interrupted: true } },
  ];
}

export function useAssistantSession({ fetch }: { fetch?: AssistantFetch } = {}) {
  const [initial] = useState(initialSession);
  const [conversationId, setConversationId] = useState(initial.conversationId);
  const hydrated = typeof window !== "undefined";
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantMessage>({
        api: "/api/assistant",
        fetch,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            version: 1,
            requestId: createId("request"),
            conversationId,
            visitorMessageCount: messages.filter(({ role }) => role === "user").length,
            messages: messagesForRequest(messages),
          },
        }),
      }),
    [conversationId, fetch],
  );
  const chat = useChat<AssistantMessage>({
    id: conversationId,
    messages:
      conversationId === initial.conversationId ? initial.messages : [],
    transport,
  });
  const setChatMessages = chat.setMessages;
  const stopChat = chat.stop;

  const visitorMessageCount = chat.messages.filter(({ role }) => role === "user").length;

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        conversationId,
        messages: textOnlyMessages(chat.messages),
        visitorMessageCount,
        incompleteResponse: chat.status === "streaming" || chat.status === "submitted" || chat.status === "error",
      }),
    );
  }, [chat.messages, chat.status, conversationId, hydrated, visitorMessageCount]);

  useEffect(() => {
    if (chat.status === "error") setChatMessages(markPartialInterrupted);
  }, [chat.status, setChatMessages]);

  useEffect(() => {
    const abortOnNavigation = () => {
      void stopChat();
    };
    window.addEventListener("pagehide", abortOnNavigation);
    return () => window.removeEventListener("pagehide", abortOnNavigation);
  }, [stopChat]);

  const send = useCallback(
    async (text: string) => {
      const normalized = text.trim();
      if (!hydrated || !normalized || normalized.length > 2_000) return;
      if (chat.status === "streaming" || chat.status === "submitted" || visitorMessageCount >= 40) return;
      chat.clearError();
      await chat.sendMessage({ text: normalized });
    },
    [chat, hydrated, visitorMessageCount],
  );

  const stop = useCallback(async () => {
    await chat.stop();
    chat.setMessages(markPartialInterrupted);
  }, [chat]);

  const retry = useCallback(async () => {
    const last = chat.messages.at(-1);
    if (!last) return;
    chat.clearError();
    await chat.regenerate({ messageId: last.id });
  }, [chat]);

  const clear = useCallback(async () => {
    await chat.stop();
    chat.setMessages([]);
    sessionStorage.removeItem(storageKey);
    setConversationId(createId("conversation"));
  }, [chat]);

  return {
    hydrated,
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    visitorMessageCount,
    send,
    stop,
    retry,
    clear,
  };
}
