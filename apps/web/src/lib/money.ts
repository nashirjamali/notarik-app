/** Integer IDR minor units to "Rp 1.500.000". Money is never a float. */
export function formatIdr(minor: number): string {
  const negative = minor < 0;
  const digits = Math.abs(Math.trunc(minor)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}Rp ${grouped}`;
}
