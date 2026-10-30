import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GrowPesa Vault",
  description: "Secure Community Treasury & Savings Portal. Join us to grow your wealth.",
  openGraph: {
    title: "GrowPesa Vault",
    description: "Join me on GrowPesa and let's grow our wealth together!",
    url: "https://GrowPesa.vercel.app",
    siteName: "GrowPesa",
    images: [
      {
        url: "/logo.png", // Ensure you have logo.png in your public folder
        width: 800,
        height: 600,
        alt: "GrowPesa Logo",
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