import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Institutional pairing in the spirit of the JHU brand fonts (Gentona/Arnhem):
// Source Sans for interface text, Source Serif for headings. Self-hosted by
// Next.js at build time - no runtime requests to font CDNs.
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Readiness Assessment (Beta)",
  description:
    "A guided assessment of whether a proposed AI use case is ready to build — for health-sector and CRVS teams. Johns Hopkins Bloomberg School of Public Health.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
