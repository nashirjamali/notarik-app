"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { confirmChat, getMe, sendChat } from "@/lib/client";
import type { PendingAction } from "@/lib/chat";
import { AiBubble, ProposalCard, TypingBubble, UserBubble, type CardState } from "./ChatParts";
import { TopBar, TopBarButton } from "./TopBar";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  at: Date;
  pending?: PendingAction | null;
  threadId?: string | null;
  state?: CardState;
  error?: string | null;
  link?: { label: string; href: string };
};

const svg = (name: string) => `/app-assets/svg/${name}.svg`;

/** Chat with Notarik. The assistant only proposes changes; nothing is saved until you press Save, Delete or Set budget. */
export function AskView() {
  const client = useQueryClient();
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
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

  const add = (message: Omit<Message, "id" | "at">) => setMessages((all) => [...all, { ...message, id: next.current++, at: new Date() }]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setDraft("");
    setBusy(true);
    add({ role: "user", text: message });
    try {
      const reply = await sendChat(message, threadId);
      setThreadId(reply.threadId ?? threadId);
      setMessages((all) => [
        // A new proposal replaces any card still waiting for an answer.
        ...(reply.pending ? all.map((m) => (m.pending && (m.state ?? "open") === "open" ? { ...m, state: "expired" as const } : m)) : all),
        { id: next.current++, at: new Date(), role: "assistant", text: reply.text || "I do not have an answer for that.", pending: reply.pending, threadId: reply.threadId ?? threadId, state: "open" },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!prompt || sentPrompt.current) return;
    sentPrompt.current = true;
    void send(prompt);
    // Once per page load; `send` changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  async function decide(id: number, decision: "approve" | "reject" | "edit", payload?: Record<string, unknown>) {
    const target = messages.find((m) => m.id === id);
    if (!target?.pending || !target.threadId) return;
    const patch = (change: Partial<Message>) => setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...change } : m)));
    patch({ state: "saving", error: null });
    try {
      const result = await confirmChat(target.threadId, decision, payload);
      const approved = result.status === "approved";
      patch({ state: approved ? "approved" : "rejected" });
      if (approved) await client.invalidateQueries();
      const kind = target.pending.kind;
      add({
        role: "assistant",
        text: !approved ? "Nothing was saved." : kind === "delete_expense" ? "Deleted." : kind === "set_budget" ? "Budget updated." : "Saved. It's in your transactions.",
        link: approved && kind === "create_expense" && result.transaction_id ? { label: "View expense", href: `/app/transactions/${result.transaction_id}` } : undefined,
      });
    } catch (e) {
      patch({ state: "open", error: e instanceof Error ? e.message : "Could not apply that" });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  const canSend = draft.trim().length > 0 && !busy;
  const greeting = `Hi${me.data?.name ? ` ${me.data.name}` : ""}! Ask me about your spending, or just tell me what you bought.`;
  const back = () => (window.history.length > 1 ? router.back() : router.replace("/app"));
  const newChat = () => {
    setMessages([]);
    setThreadId(null);
    setDraft("");
    setError(null);
  };

  return (
    <div className="-mb-32 flex h-[calc(100dvh-8rem)] min-h-96 flex-col md:mb-0 md:h-[calc(100dvh-8rem)]">
      <TopBar
        title="Ask Notarik"
        onBack={back}
        right={
          <TopBarButton label="New chat" onClick={newChat}>
            <Image src={svg("chat-new-chat")} alt="" width={24} height={24} unoptimized />
          </TopBarButton>
        }
      />
      <div className="mb-4 hidden items-center justify-between md:flex">
        <h1 className="flex items-center gap-2 font-heading text-headline-4 font-bold">
          <Image src={svg("chat-avatar-mark")} alt="" width={26} height={23} unoptimized />
          Ask Notarik
        </h1>
        {messages.length > 0 && (
          <button type="button" onClick={newChat} className="rounded-full bg-surface-default px-5 py-2.5 text-button-2 font-bold hover:bg-border-default">
            New chat
          </button>
        )}
      </div>
      <h1 className="sr-only md:hidden">Ask Notarik</h1>

      <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-1 flex-col gap-3.5 overflow-y-auto pb-4 md:rounded-3xl md:bg-surface-subtle md:p-6">
        <AiBubble text={greeting} />
        {messages.map((message) =>
          message.role === "user" ? (
            <UserBubble key={message.id} text={message.text} />
          ) : (
            <AiBubble key={message.id} text={message.text}>
              {message.pending && (
                <ProposalCard
                  pending={message.pending}
                  state={message.state ?? "open"}
                  at={message.at}
                  error={message.error}
                  onApprove={() => void decide(message.id, "approve")}
                  onReject={() => void decide(message.id, "reject")}
                  onEdit={(payload) => void decide(message.id, "edit", payload)}
                />
              )}
              {message.link && (
                <Link href={message.link.href} className="text-caption font-medium text-brand-primary-strong hover:underline">
                  {message.link.label}
                </Link>
              )}
            </AiBubble>
          ),
        )}
        {busy && <TypingBubble />}
        <div ref={end} />
      </div>

      {error && (
        <p role="alert" className="mb-2 rounded-2xl bg-status-danger-subtle px-4 py-2.5 text-caption text-status-danger-text">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="flex items-center gap-3 rounded-xl border-2 border-border-default bg-surface-default p-3 focus-within:border-brand-primary">
        <Link href="/app/receipts/new" aria-label="Scan a receipt" className="flex h-10 shrink-0 items-center">
          <Image src={svg("chat-camera")} alt="" width={24} height={24} unoptimized />
        </Link>
        <input
          aria-label="Message"
          placeholder="Ask or log an expense…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={2000}
          className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
        />
        <button type="submit" aria-label="Send" disabled={!canSend} className="flex shrink-0 rounded-xl bg-brand-primary p-2 disabled:opacity-50">
          <Image src={svg("chat-arrow-up")} alt="" width={24} height={24} unoptimized />
        </button>
      </form>
    </div>
  );
}
