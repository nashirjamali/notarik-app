export function createRefreshGate() {
  let inflight: Promise<boolean> | null = null;
  return function gate(run: () => Promise<boolean>): Promise<boolean> {
    if (!inflight) {
      inflight = run().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
}

export async function requestWithRefresh(
  send: () => Promise<{ status: number }>,
  refresh: () => Promise<boolean>,
): Promise<{ status: number }> {
  const first = await send();
  if (first.status !== 401) return first;
  const refreshed = await refresh();
  if (!refreshed) return first;
  return send();
}
