import type { Metadata } from "next";
import { initializeApp } from "@/lib/startup";
import "./globals.css";
import "../styles/portal-fix.css";

// Initialize app services on startup
if (typeof window === 'undefined') {
  initializeApp().catch(console.error);
}

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
