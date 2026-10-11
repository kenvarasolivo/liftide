import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Liftide — Your training, sharpened.', description: 'Train with intent. Your machine-aware workout companion, rest timer, and muscle map.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
