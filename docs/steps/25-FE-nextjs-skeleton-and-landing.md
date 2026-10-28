# 25 — Next.js skeleton and landing page

**Label:** FE · **Phase:** 6 (web) · **Depends on:** 06 (design tokens) · **Size:** ~8–10 h

## Goal
A Next.js app in `apps/web/` that deploys and serves the public landing page from the Figma design, responsive at 1440, 768 and 390.

## You will learn
- Next.js App Router: server vs client components, static rendering, layouts
- SEO basics: metadata, Open Graph image, semantic HTML, `sitemap` and `robots`
- Responsive CSS (media queries, container widths) from a design with three breakpoints
- Turning Figma variables into code tokens, and exporting images (the 3D icons) for the web

## Build
- [x] Create `apps/web/` (Next.js, TypeScript, App Router). Styling: Tailwind 4, because tokens and breakpoints live in one place (`@theme` in `globals.css`).
- [x] Tokens: copy the Figma `Color` variables and the text styles (DM Sans for headings, Poppins for body) into one tokens file. No hard-coded colors in components. (`src/app/globals.css`; the default Tailwind palette is removed on purpose.)
- [x] Fonts with `next/font` (`layout.tsx`).
- [x] Export the 3D icons from the Figma "Apps" page (coffee, groceries, transport, bills, camera, mic, quick add, recap, budget, receipt) at 2x or 3x and serve them with `next/image`. (The Figma sources are 128–144 px PNGs, so they look soft above about 2x of 72 px; ask for larger exports before launch.)
- [x] Landing sections, in order: nav, hero (phone mockup, floating cards), category strip, features (bento), how it works, Ask Notarik, FAQ, CTA banner, footer. Figma frames: Desktop `667:249`, Tablet and Mobile on the same page.
- [x] Store badges: Web app (links to `/app`), App Store and Google Play marked "Coming soon". Use the official badge artwork before launch, not the hand-drawn logos from the design.
- [x] Footer credit: "Made by Nashir Jamali" linking to `https://nashir.tech`.
- [x] Metadata, Open Graph image, `robots.txt`, `sitemap.xml`, favicon from the brand mark.

## Done when
- `/` matches the Figma frame at 1440, 768 and 390 with no horizontal scroll.
- Lighthouse (mobile): performance, accessibility and SEO each ≥ 90.
- The page works with JavaScript disabled (it is mostly static).

## Tests
- A Playwright smoke test that loads `/` at the three widths and checks the headline, the three store badges, and that "Web app" links to `/app`.
- Optional: screenshot comparison per width, with a tolerance.

## Pitfalls
- Shipping claims that are not true yet. Check "Receipt read in 3s" and "Available now on the Web app" against reality before launch.
- Large unoptimized PNGs. Use `next/image` and the right sizes.
- Text in Figma is not always real heading structure. Use one `h1` and a sensible outline.
- Contrast: white text on the violet gradient and the white "Coming soon" tags need a check.
- Copying v1 code. Re-implement from the design.

## Read
- Next.js docs (App Router, metadata, `next/image`, `next/font`); WCAG contrast; the Figma file `Notarik` → page "Web"
