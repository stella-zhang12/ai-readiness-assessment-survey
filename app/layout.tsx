import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Readiness Assessment (Beta)",
  description:
    "A guided assessment of whether a proposed AI use case is ready to build — for health-sector and CRVS teams. Johns Hopkins Bloomberg School of Public Health.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
