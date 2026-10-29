import { expect, test } from "vitest";
import { parseChatStream, splitAmounts } from "./chat";

const stream = [
  'event: token\ndata: {"text": "Got it. "}',
  'event: token\ndata: {"text": "Here is the plan."}',
  'event: pending_action\ndata: {"kind": "create_expense", "payload": {"total_minor": 25000}, "summary": "Save Rp 25.000?"}',
  'event: done\ndata: {"thread_id": "t-1", "route": "capture"}',
  "",
].join("\n\n");

test("reads text, the pending action and the thread from the event stream", () => {
  const reply = parseChatStream(stream);
  expect(reply.text).toBe("Got it. Here is the plan.");
  expect(reply.pending?.summary).toBe("Save Rp 25.000?");
  expect(reply.threadId).toBe("t-1");
  expect(reply.route).toBe("capture");
});

test("ignores malformed events instead of failing", () => {
  const reply = parseChatStream('event: token\ndata: {not json}\n\nevent: token\ndata: {"text": "ok"}\n\n');
  expect(reply.text).toBe("ok");
  expect(reply.pending).toBeNull();
});

test("marks amounts inside a sentence", () => {
  expect(splitAmounts("You spent Rp 342.500 on food")).toEqual([
    { text: "You spent ", amount: false },
    { text: "Rp 342.500", amount: true },
    { text: " on food", amount: false },
  ]);
});
