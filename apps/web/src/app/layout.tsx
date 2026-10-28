import type { Metadata } from "next";
import { DM_Sans, Poppins } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const description =
  "Photograph a receipt or just type what you bought. Notarik fills in the details, sorts the category and keeps your month on track.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Notarik · Snap it. We'll sort it.",
    template: "%s · Notarik",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "Notarik",
    title: "Notarik · Snap it. We'll sort it.",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Notarik · Snap it. We'll sort it.",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions (Grammarly, Dark Reader, translators) add attributes to <html> and <body>
    // before React hydrates. suppressHydrationWarning only covers these two elements, not their children.
    <html
      lang="en"
      className={`${dmSans.variable} ${poppins.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Lets the CSS hide scroll-reveal content only when JavaScript is running. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
