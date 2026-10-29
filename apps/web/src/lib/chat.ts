export type PendingAction = {
  kind: "create_expense" | "delete_expense" | "set_budget";
  summary: string;
  payload: Record<string, unknown>;
};

export type ChatReply = { text: string; pending: PendingAction | null; threadId: string | null; route: string | null };

/** The API sends the whole answer as one event stream; read it into one reply. */
export function parseChatStream(body: string): ChatReply {
  const reply: ChatReply = { text: "", pending: null, threadId: null, route: null };
  for (const block of body.split("\n\n")) {
    const event = /^event: (\w+)/m.exec(block)?.[1];
    const data = /^data: (.*)$/m.exec(block)?.[1];
    if (!event || data === undefined) continue;
    let value: Record<string, unknown>;
    try {
      value = JSON.parse(data);
    } catch {
      continue;
    }
    if (event === "token") reply.text += String(value.text ?? "");
    else if (event === "pending_action" && typeof value.summary === "string") reply.pending = value as unknown as PendingAction;
    else if (event === "done") {
      reply.threadId = typeof value.thread_id === "string" ? value.thread_id : null;
      reply.route = typeof value.route === "string" ? value.route : null;
    }
  }
  return reply;
}

/** Splits "You spent Rp 342.500" so amounts can be shown in a heavier weight. Text stays text: never HTML. */
export function splitAmounts(text: string): { text: string; amount: boolean }[] {
  return text
    .split(/(-?Rp\s[\d.]+)/g)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, amount: /^-?Rp\s[\d.]+$/.test(part) }));
}
