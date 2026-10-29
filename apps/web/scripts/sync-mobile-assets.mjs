// Copies the mobile app's SVGs and icons into public/app-assets so the web app draws the same artwork.
// Run `npm run sync:assets` after the mobile assets change; the copies are committed so a build needs no sibling checkout.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "../../mobile/assets");
const target = join(here, "../public/app-assets");

rmSync(target, { recursive: true, force: true });
for (const folder of ["svg", "icons"]) {
  mkdirSync(join(target, folder), { recursive: true });
  cpSync(join(source, folder), join(target, folder), { recursive: true });
}
console.log(`Copied mobile assets to ${target}`);
