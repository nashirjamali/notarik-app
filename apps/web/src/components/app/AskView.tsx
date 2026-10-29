"use client";

import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { confirmChat, sendChat } from "@/lib/client";
import { splitAmounts, type PendingAction } from "@/lib/chat";
import { PageTitle } from "./ui";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  pending?: PendingAction | null;
  threadId?: string | null;
  decision?: "approved" | "rejected" | "failed";
};

const suggestions = ["How much did I spend this month?", "Am I on track with my budget?", "kopi 25rb tadi pagi"];

function Amounts({ text }: { text: string }) {
  return (
    <>
      {splitAmounts(text).map((part, index) =>
        part.amount ? (
          <strong key={index} className="font-semibold">
            {part.text}
          </strong>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Chat with Notarik. The assistant only proposes changes; nothing is saved until you press Confirm. */
export function AskView() {
  const client = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = useRef(1);
  const end = useRef<HTMLDivElement>(null);
  // Home's "Try asking Notarik" chips open Chat with ?prompt=..., which is sent once.
  const prompt = useSearchParams().get("prompt");
  const sentPrompt = useRef(false);

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    if (!prompt || sentPrompt.current) return;
    sentPrompt.current = true;
    void send(prompt);
    // Once per page load; `send` changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    setMessages((all) => [...all, { id: next.current++, role: "user", text: message }]);
    try {
      const reply = await sendChat(message, threadId);
      setThreadId(reply.threadId ?? threadId);
      setMessages((all) => [
        ...all,
        { id: next.current++, role: "assistant", text: reply.text || "I do not have an answer for that.", pending: reply.pending, threadId: reply.threadId },
      ]);
      // An answer can come from fresh data; nothing was written until a confirm, so no refresh needed here.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: number, threadForAction: string, decision: "approve" | "reject") {
    try {
      const result = await confirmChat(threadForAction, decision);
      const outcome = result.status === "approved" ? "approved" : "rejected";
      setMessages((all) => all.map((m) => (m.id === id ? { ...m, decision: outcome } : m)));
      if (outcome === "approved") await client.invalidateQueries();
    } catch (e) {
      setMessages((all) => all.map((m) => (m.id === id ? { ...m, decision: "failed" } : m)));
      setError(e instanceof Error ? e.message : "Could not apply that");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form).get("message");
    form.reset();
    void send(String(input ?? ""));
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-96 flex-col md:h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-8rem)]">
      <PageTitle
        aside={
          messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setThreadId(null);
                setError(null);
              }}
              className="rounded-full bg-surface-default px-5 py-2.5 text-button-2 font-bold hover:bg-border-default"
            >
              New chat
            </button>
          )
        }
      >
        Ask Notarik
      </PageTitle>

      <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-3xl bg-surface-default p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="m-auto flex max-w-md flex-col items-center gap-4 text-center">
            <Image src="/brand/mark.svg" alt="" width={64} height={55} unoptimized className="h-12 w-auto" />
            <p className="text-body-2 text-text-secondary">
              Ask about your spending, or tell me what you bought. I only suggest changes; you confirm them.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => void send(text)}
                  className="rounded-full bg-brand-accent-subtle px-4 py-2 text-caption font-medium text-brand-primary-strong hover:bg-brand-accent"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <p
                className={`max-w-[85%] rounded-[22px] px-[18px] py-3 text-body-2 break-words whitespace-pre-wrap ${
                  m.role === "user" ? "bg-brand-primary text-text-inverse" : "bg-surface-subtle"
                }`}
              >
                {m.role === "assistant" ? <Amounts text={m.text} /> : m.text}
              </p>
              {m.pending && (
                <div className="flex max-w-[85%] flex-col gap-3 rounded-3xl border border-border-default p-4">
                  <p className="text-body-2 font-medium">{m.pending.summary}</p>
                  {m.decision === undefined && m.threadId ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void decide(m.id, m.threadId!, "reject")}
                        className="flex-1 rounded-full bg-surface-subtle px-5 py-2.5 text-button-2 font-bold hover:bg-border-default"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void decide(m.id, m.threadId!, "approve")}
                        className="flex-1 rounded-full bg-brand-primary px-5 py-2.5 text-button-2 font-bold text-text-inverse hover:bg-brand-primary-strong"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <p className="text-caption text-text-secondary">
                      {m.decision === "approved" ? "Done. Saved." : m.decision === "rejected" ? "Cancelled. Nothing was changed." : "That did not go through."}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        {busy && (
          <p aria-label="Notarik is typing" className="self-start rounded-[22px] bg-surface-subtle px-[18px] py-3 text-body-2 text-text-secondary">
            …
          </p>
        )}
        <div ref={end} />
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-2xl bg-status-danger-subtle px-4 py-2.5 text-caption text-status-danger">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          name="message"
          aria-label="Message"
          autoComplete="off"
          maxLength={2000}
          placeholder="Ask or log an expense"
          className="min-w-0 flex-1 rounded-full border border-border-default bg-surface-default px-5 py-3 text-body-2 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand-primary px-6 py-3 font-heading text-button-1 font-bold text-text-inverse hover:bg-brand-primary-strong disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
