import { monthLabel, parseChatStream, splitAmounts } from "@/lib/chat";

describe("parseChatStream", () => {
  it("reads the text, the proposal and the thread from the event stream", () => {
    const body =
      'event: token\ndata: {"text": "Got it. Here\'s what I\'ll log:"}\n\n' +
      'event: pending_action\ndata: {"kind": "create_expense", "payload": {"total_minor": 25000}, "summary": "Save Rp 25.000 as Food & Drink?"}\n\n' +
      'event: done\ndata: {"thread_id": "t1", "route": "capture"}\n\n';
    expect(parseChatStream(body)).toEqual({
      text: "Got it. Here's what I'll log:",
      pending: { kind: "create_expense", payload: { total_minor: 25000 }, summary: "Save Rp 25.000 as Food & Drink?" },
      threadId: "t1",
      route: "capture",
    });
  });

  it("has no proposal when the stream carries none, and skips broken events", () => {
    const body = 'event: token\ndata: {"text": "Hi"}\n\nevent: token\ndata: {oops\n\nevent: done\ndata: {"thread_id": "t2", "route": "smalltalk"}\n\n';
    expect(parseChatStream(body)).toMatchObject({ text: "Hi", pending: null, threadId: "t2" });
  });
});

describe("splitAmounts", () => {
  it("marks rupiah amounts inside a sentence", () => {
    expect(splitAmounts("You spent Rp 342.500 on food, 12% less.")).toEqual([
      { text: "You spent ", amount: false },
      { text: "Rp 342.500", amount: true },
      { text: " on food, 12% less.", amount: false },
    ]);
    expect(splitAmounts("No amounts here")).toEqual([{ text: "No amounts here", amount: false }]);
  });
});

describe("monthLabel", () => {
  it("spells the month out", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(monthLabel("nope")).toBe("nope");
  });
});
