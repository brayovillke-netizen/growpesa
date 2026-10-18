import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GrowPesa',
  description: 'Save weekly. Borrow when ready.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink">{children}</body>
    </html>
  );
}