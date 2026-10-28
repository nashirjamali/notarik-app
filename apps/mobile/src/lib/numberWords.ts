// Indonesian numbers written as words ("dua puluh lima ribu") turned into digits ("25.000"), so the
// Quick add parser, which reads digits, can also read what someone says out loud.

const UNITS: Record<string, number> = {
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
};
/** Words that carry their own value: "sepuluh" is 10, "seratus" is 100. */
const FIXED: Record<string, number> = { sepuluh: 10, sebelas: 11, seratus: 100 };
/** Words that are a thousand or a million all by themselves. */
const SCALE_ALONE: Record<string, number> = { seribu: 1_000, sejuta: 1_000_000 };
const SCALES: Record<string, number> = { ribu: 1_000, juta: 1_000_000 };
/** The words a part below a thousand can end on; a bare digit can be a quantity instead. */
const ENDS_AMOUNT = new Set(["ratus", "puluh", "belas", "seratus", "sepuluh", "sebelas"]);

const WORDS = [
  ...Object.keys(UNITS),
  ...Object.keys(FIXED),
  ...Object.keys(SCALE_ALONE),
  ...Object.keys(SCALES),
  "puluh",
  "belas",
  "ratus",
  "setengah",
];
// Whole words only, so "satuan" and "ribuan" are left alone. A run is words separated by spaces.
const RUN = new RegExp(`\\b(?:${WORDS.join("|")})(?:\\s+(?:${WORDS.join("|")}))*\\b`, "gi");

/** The value of a run of number words, or null when the words do not make a number. */
function valueOf(words: string[]): number | null {
  let total = 0;
  // chunk is the part below 1000 being built; pending is a digit waiting for what follows it.
  let chunk = 0;
  let pending = 0;
  for (const word of words) {
    if (word in UNITS) {
      if (pending !== 0) return null;
      pending = UNITS[word];
    } else if (word in FIXED) {
      if (pending !== 0) return null;
      chunk += FIXED[word];
    } else if (word === "puluh") {
      chunk += (pending || 1) * 10;
      pending = 0;
    } else if (word === "belas") {
      if (pending === 0) return null;
      chunk += 10 + pending;
      pending = 0;
    } else if (word === "ratus") {
      chunk += (pending || 1) * 100;
      pending = 0;
    } else if (word === "setengah") {
      // "satu setengah juta" is 1.5 million, "setengah juta" is half a million.
      pending += 0.5;
    } else if (word in SCALE_ALONE) {
      if (pending !== 0 || chunk !== 0) return null;
      total += SCALE_ALONE[word];
    } else if (word in SCALES) {
      const amount = chunk + pending;
      total += (amount || 1) * SCALES[word];
      chunk = 0;
      pending = 0;
    }
  }
  return Math.round(total + chunk + pending);
}

function format(value: number): string {
  return value >= 1_000 ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : String(value);
}

/**
 * Replaces every run of number words that is an amount of a thousand or more with digits, written
 * with dots like the amounts people type ("lima ribu" becomes "5.000"). A run without ribu or juta
 * is left as words: "dua kopi" is a quantity, not an amount, and "satuan" is just a word.
 */
export function wordsToDigits(text: string): string {
  return text.replace(RUN, (run) => {
    const original = run.split(/\s+/);
    const words = original.map((word) => word.toLowerCase());
    const lastScale = words.reduce((index, word, at) => (word in SCALES || word in SCALE_ALONE ? at : index), -1);
    if (lastScale < 0) return run;
    // What follows the last ribu or juta is only part of the amount when it is a hundreds or tens
    // part ("lima ribu dua ratus"). A bare digit there is a quantity: "lima ribu dua kopi".
    let end = words.length;
    while (end > lastScale + 1 && !ENDS_AMOUNT.has(words[end - 1])) end--;
    const value = valueOf(words.slice(0, end));
    if (value == null || value <= 0) return run;
    return [format(value), ...original.slice(end)].join(" ");
  });
}
