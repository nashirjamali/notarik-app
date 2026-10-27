import { apiText } from "@/lib/api";
import type { Category } from "@/theme/tokens";

export type ExpensePayload = {
  merchant: string | null;
  date: string | null;
  total_minor: number | null;
  category: Category;
  items: { name: string; qty?: number | null; line_total_minor: number | null }[];
};

export type PendingAction =
  | { kind: "create_expense"; payload: ExpensePayload; summary: string }
  | { kind: "delete_expense"; payload: { transaction_id: string; merchant?: string }; summary: string }
  | { kind: "set_budget"; payload: { month: string; total_minor: number }; summary: string };

export type ChatReply = {
  text: string;
  pending: PendingAction | null;
  threadId: string | null;
  route: string | null;
};

export type ConfirmResult = { status: "approved" | "rejected"; transaction_id?: string };

/** The API sends the whole answer as one event stream; read it into one reply. */
export function parseChatStream(body: string): ChatReply {
  const reply: ChatReply = { text: "", pending: null, threadId: null, route: null };
  for (const block of body.split("\n\n")) {
    const event = /^event: (\w+)/m.exec(block)?.[1];
    const data = /^data: (.*)$/m.exec(block)?.[1];
    if (!event || data == null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    const value = parsed as Record<string, unknown>;
    if (event === "token") reply.text += String(value.text ?? "");
    else if (event === "pending_action") reply.pending = value as unknown as PendingAction;
    else if (event === "done") {
      reply.threadId = (value.thread_id as string) ?? null;
      reply.route = (value.route as string) ?? null;
    }
  }
  return reply;
}

export async function sendChat(message: string, threadId: string | null): Promise<ChatReply> {
  const body = await apiText("/chat", {
    method: "POST",
    body: JSON.stringify({ message, thread_id: threadId }),
  });
  return parseChatStream(body);
}

export async function confirmChat(
  threadId: string,
  decision: "approve" | "reject" | "edit",
  payload?: Record<string, unknown>,
): Promise<ConfirmResult> {
  const body = await apiText(`/chat/${threadId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ decision, payload }),
  });
  return JSON.parse(body) as ConfirmResult;
}

/** Split "You spent Rp 342.500 on food" so the amounts can be shown in medium weight. */
export function splitAmounts(text: string): { text: string; amount: boolean }[] {
  return text
    .split(/(-?Rp\s[\d.]+)/g)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, amount: /^-?Rp\s[\d.]+$/.test(part) }));
}

export { monthLabel } from "@/lib/months";
