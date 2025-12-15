import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'rMaps - Find Your Friends',
  description: 'Collaborative real-time friend-finding navigation for events',
  keywords: ['maps', 'navigation', 'friends', 'realtime', 'CCC', '38c3'],
  authors: [{ name: 'Jeff Emmett' }],
  openGraph: {
    title: 'rMaps - Find Your Friends',
    description: 'Collaborative real-time friend-finding navigation for events',
    url: 'https://rmaps.online',
    siteName: 'rMaps',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'rMaps - Find Your Friends',
    description: 'Collaborative real-time friend-finding navigation for events',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
