import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const barlow = localFont({
  src: [
    { path: "./fonts/barlow-condensed-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/barlow-condensed-latin-700-normal.woff2", weight: "700" },
    { path: "./fonts/barlow-condensed-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-barlow",
  display: "swap",
});

const inter = localFont({
  src: [{ path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900" }],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dennis Dirtworx — Excavation. Grading. Site Prep.",
  description:
    "Dennis Dirtworx delivers precise excavation, grading and site preparation with dependable equipment and a commitment to getting the job done right.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${barlow.variable} ${inter.variable}`}>
      <body className="bg-ink text-cream antialiased">{children}</body>
    </html>
  );
}
