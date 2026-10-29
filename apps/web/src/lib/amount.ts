/**
 * Parses what a person types for a money amount into integer rupiah: "25rb", "1,5jt", "25.000", "1.500.000".
 * Returns null when it is not a clean, non-negative amount. Never produces a fraction of a rupiah.
 */
export function parseAmount(input: string): number | null {
  let rest = input.trim().toLowerCase().replace(/\s|^rp\.?/g, "");
  if (!rest || rest.startsWith("-")) return null;
  let multiplier = 1;
  for (const [suffix, value] of [["juta", 1_000_000], ["jt", 1_000_000], ["ribu", 1_000], ["rb", 1_000], ["k", 1_000]] as const) {
    if (rest.endsWith(suffix)) {
      multiplier = value;
      rest = rest.slice(0, -suffix.length);
      break;
    }
  }
  const number = parseDecimal(rest, multiplier !== 1);
  if (number === null) return null;
  const value = Math.round(number * multiplier);
  return Number.isSafeInteger(value) ? value : null;
}

function parseDecimal(raw: string, allowFraction: boolean): number | null {
  let body = raw;
  if (body.includes(",") && body.includes(".")) body = body.replace(/\./g, "").replace(",", ".");
  else if (body.includes(",")) body = body.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(body)) body = body.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(body)) return null;
  if (!allowFraction && body.includes(".")) return null;
  return Number(body);
}
