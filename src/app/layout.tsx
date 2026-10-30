import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowPesa Vault",
  description: "Track your personal savings effortlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}