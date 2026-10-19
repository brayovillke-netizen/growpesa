import type { Metadata, Viewport } from 'next';
import './globals.css';
import RegisterSW from './components/RegisterSW';

export const metadata: Metadata = {
  title: 'GrowPesa',
  description: 'Save weekly. Borrow when ready.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GrowPesa',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B5D3B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}