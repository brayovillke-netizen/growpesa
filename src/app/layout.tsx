import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TibaPay Vault",
  description: "Secure Community Treasury & Savings Portal. Join us to grow your wealth.",
  openGraph: {
    title: "TibaPay Vault",
    description: "Join me on TibaPay and let's grow our wealth together!",
    url: "https://tibapay.vercel.app",
    siteName: "TibaPay",
    images: [
      {
        url: "/logo.png", // Ensure you have logo.png in your public folder
        width: 800,
        height: 600,
        alt: "TibaPay Logo",
      },
    ],
    locale: "en_KE",
    type: "website",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}