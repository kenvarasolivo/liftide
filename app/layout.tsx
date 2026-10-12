import type { Metadata, Viewport } from 'next';
import { PwaControls } from '@/components/pwa-controls';
import './globals.css';
export const metadata: Metadata = { title: 'Liftide — Your training, sharpened.', description: 'Train with intent. Your machine-aware workout companion, rest timer, and muscle map.' };
export const viewport: Viewport = { themeColor: '#17191b' };
metadata.applicationName = 'Liftide';
metadata.appleWebApp = { capable: true, title: 'Liftide', statusBarStyle: 'default' };
metadata.icons = { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-scroll-behavior="smooth"><body><PwaControls />{children}</body></html>; }
