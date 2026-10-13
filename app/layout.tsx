import type { Metadata, Viewport } from 'next';
import { PwaControls } from '@/components/pwa-controls';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';
import './polish.css';
export const metadata: Metadata = { title: 'Liftide — Your training, sharpened.', description: 'Train with intent. Your machine-aware workout companion, rest timer, and muscle map.' };
export const viewport: Viewport = { themeColor: '#17191b', viewportFit: 'cover' };
metadata.applicationName = 'Liftide';
metadata.appleWebApp = { capable: true, title: 'Liftide', statusBarStyle: 'default' };
metadata.icons = { icon: [{ url: '/icons/icon-192.png', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-scroll-behavior="smooth"><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head><body><AuthProvider><PwaControls />{children}</AuthProvider></body></html>; }
