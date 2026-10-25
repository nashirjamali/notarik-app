export function formatIdr(minor: number): string {
  const negative = minor < 0;
  const digits = Math.abs(Math.trunc(minor)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}Rp ${grouped}`;
}

export function parseAmount(input: string): number | null {
  const trimmed = input.trim().toLowerCase().replace(/\s/g, "");
  if (!trimmed || trimmed.startsWith("-")) return null;
  let multiplier = 1;
  let rest = trimmed;
  if (rest.endsWith("juta")) {
    multiplier = 1_000_000;
    rest = rest.slice(0, -4);
  } else if (rest.endsWith("jt")) {
    multiplier = 1_000_000;
    rest = rest.slice(0, -2);
  } else if (rest.endsWith("ribu")) {
    multiplier = 1_000;
    rest = rest.slice(0, -4);
  } else if (rest.endsWith("rb")) {
    multiplier = 1_000;
    rest = rest.slice(0, -2);
  }
  const parsed = parseDecimal(rest, multiplier !== 1);
  if (parsed == null) return null;
  const value = parsed * multiplier;
  if (!Number.isFinite(value) || value < 0) return null;
  const rounded = Math.round(value);
  if (multiplier === 1 && !Number.isInteger(parsed)) return null;
  return rounded;
}

function parseDecimal(raw: string, allowFraction: boolean): number | null {
  if (!raw) return null;
  let body = raw;
  if (body.includes(",") && body.includes(".")) {
    body = body.replace(/\./g, "").replace(",", ".");
  } else if (body.includes(",")) {
    body = body.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(body)) {
    body = body.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(body)) return null;
  if (!allowFraction && body.includes(".")) return null;
  return Number(body);
}

export function itemsTotal(items: { lineTotalMinor: number }[]): number {
  return items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
}

export function totalsDiffer(
  totalMinor: number,
  items: { lineTotalMinor: number }[],
): boolean {
  return items.length > 0 && itemsTotal(items) !== totalMinor;
}
