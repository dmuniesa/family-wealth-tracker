import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { initializeApp } from "@/lib/startup";
import "./globals.css";

// Initialize app services on startup
if (typeof window === 'undefined') {
  initializeApp().catch(console.error);
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Wealth Tracker",
  description: "Track your family's banking and investment accounts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
