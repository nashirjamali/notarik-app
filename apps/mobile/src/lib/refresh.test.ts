import { createRefreshGate, requestWithRefresh } from "./refresh";

test("shares one refresh across overlapping requests", async () => {
  const gate = createRefreshGate();
  let calls = 0;
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const run = () => {
    calls += 1;
    return pending.then(() => true);
  };
  const first = gate(run);
  const second = gate(run);
  release();
  await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  expect(calls).toBe(1);
});

test("retries a request once after a successful refresh", async () => {
  const statuses = [401, 200];
  const send = jest.fn(async () => ({ status: statuses.shift() ?? 500 }));
  const refresh = jest.fn(async () => true);
  await expect(requestWithRefresh(send, refresh)).resolves.toEqual({ status: 200 });
  expect(send).toHaveBeenCalledTimes(2);
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("does not retry when refresh fails", async () => {
  const send = jest.fn(async () => ({ status: 401 }));
  await expect(requestWithRefresh(send, async () => false)).resolves.toEqual({ status: 401 });
  expect(send).toHaveBeenCalledTimes(1);
});
