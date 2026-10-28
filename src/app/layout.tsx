import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TibaPay - Community Savings & Payouts",
  description: "Smart community savings and payouts platform",
  manifest: "/manifest.json",
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-white min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  );
}