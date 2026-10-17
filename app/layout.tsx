import type { Metadata, Viewport } from 'next';
import { PwaControls } from '@/components/pwa-controls';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';
import './polish.css';
import './premium.css';
export const metadata: Metadata = { title: 'Liftide — Your training, sharpened.', description: 'Train with intent. Your machine-aware workout companion, rest timer, and muscle map.' };
export const viewport: Viewport = { themeColor: '#09090b', viewportFit: 'cover' };
metadata.applicationName = 'Liftide';
metadata.appleWebApp = { capable: true, title: 'Liftide', statusBarStyle: 'default' };
metadata.icons = {
  icon: [
    { url: '/icons/liftide.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
    { url: '/icons/liftide-32.png', sizes: '32x32', type: 'image/png' },
    { url: '/icons/liftide-192.png', sizes: '192x192', type: 'image/png' },
  ],
  shortcut: '/icons/liftide.ico',
  apple: [{ url: '/icons/liftide-apple-touch.png', sizes: '180x180', type: 'image/png' }],
};
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-scroll-behavior="smooth"><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head><body><AuthProvider><PwaControls />{children}</AuthProvider></body></html>; }
