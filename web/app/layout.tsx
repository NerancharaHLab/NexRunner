import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import TopNav from "./TopNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Most of this app's actual UI text is Thai (labels, scenario names, notes),
// so Geist alone (Latin-only) isn't enough — this covers Thai glyphs with a
// face that pairs cleanly with Geist for the Latin/UI-chrome parts.
const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Test Runner",
  description: "QA Test Runner — Cortex HIS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexSansThai.variable}`}>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
