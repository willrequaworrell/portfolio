"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useAssistantSession } from "@/lib/assistant-session";

const suggestions = [
  "What kind of products does Will build?",
  "Tell me about Will’s work on FinderlyFix.",
  "What stands out about Will’s engineering approach?",
];

function SafeAnswer({ children }: { children: string }) {
  return (
    <ReactMarkdown
      allowedElements={["p", "em", "strong", "ul", "ol", "li"]}
      skipHtml
      unwrapDisallowed
    >
      {children}
    </ReactMarkdown>
  );
}

function messageText(parts: ReturnType<typeof useAssistantSession>["messages"][number]["parts"]) {
  return parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map(({ text }) => text)
    .join("");
}

export function PortfolioAssistant() {
  const session = useAssistantSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const active = session.status === "submitted" || session.status === "streaming";
  const conversationStarted = session.messages.some(({ role }) => role === "user");

  async function ask(question: string) {
    setInput("");
    await session.send(question);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  async function close() {
    if (active) await session.stop();
    setOpen(false);
  }

  return (
    <aside className="assistant-shell" data-testid="portfolio-assistant">
      {!open ? (
        <button className="assistant-launcher" onClick={() => setOpen(true)} type="button">
          <span aria-hidden="true">✦</span> Ask the AI guide
        </button>
      ) : (
        <section aria-label="AI portfolio guide" className="assistant-window" role="dialog">
          <header className="assistant-window__header">
            <div>
              <span className="assistant-window__eyebrow">AI portfolio guide</span>
              <h2>Ask about Will</h2>
            </div>
            <button aria-label="Close AI guide" onClick={() => void close()} type="button">×</button>
          </header>

          <div aria-live="polite" className="assistant-transcript">
            {!conversationStarted ? (
              <div className="assistant-intro">
                <p>I can answer concise questions from Will’s supplied portfolio material.</p>
                <div className="assistant-suggestions">
                  {suggestions.map((suggestion) => (
                    <button disabled={!session.hydrated} key={suggestion} onClick={() => void ask(suggestion)} type="button">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {session.messages.map((message) => {
              const text = messageText(message.parts);
              return (
                <article className={`assistant-message assistant-message--${message.role}`} key={message.id}>
                  <span>{message.role === "user" ? "You" : "AI guide"}</span>
                  {message.role === "assistant" ? <SafeAnswer>{text}</SafeAnswer> : <p>{text}</p>}
                  {message.metadata?.interrupted ? <small>Answer interrupted</small> : null}
                </article>
              );
            })}
          </div>

          {session.error ? <p className="assistant-error">The answer was interrupted. You can retry.</p> : null}
          <div className="assistant-actions">
            {active ? <button onClick={() => void session.stop()} type="button">Stop</button> : null}
            {!active && session.messages.length > 0 && (session.error || session.messages.at(-1)?.metadata?.interrupted) ? (
              <button onClick={() => void session.retry()} type="button">Retry</button>
            ) : null}
            {conversationStarted ? <button onClick={() => void session.clear()} type="button">New conversation</button> : null}
          </div>

          <form className="assistant-composer" onSubmit={submit}>
            <label htmlFor="assistant-question">Question</label>
            <div>
              <textarea
                disabled={!session.hydrated || active || session.visitorMessageCount >= 40}
                id="assistant-question"
                maxLength={2_000}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about Will’s work…"
                rows={2}
                value={input}
              />
              <button disabled={!input.trim() || active || !session.hydrated} type="submit">Send</button>
            </div>
          </form>

          <footer>
            Questions are processed by an AI provider. Conversation continuity is limited to this browser tab. Don’t submit confidential information.
          </footer>
        </section>
      )}
    </aside>
  );
}
