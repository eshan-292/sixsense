import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SixSense | IPL Prediction Market",
    template: "%s | SixSense",
  },
  description:
    "Predict IPL match outcomes, compete with friends, and prove your cricket knowledge. Play with virtual coins — no real money involved.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://sixsense-mu.vercel.app"),
  openGraph: {
    title: "SixSense | IPL Prediction Market",
    description:
      "Predict IPL 2026 match outcomes with virtual coins. Compete on the leaderboard and prove your cricket knowledge!",
    siteName: "SixSense",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SixSense | IPL Prediction Market",
    description:
      "Predict IPL 2026 match outcomes with virtual coins. Compete on the leaderboard!",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1 pb-14 sm:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
