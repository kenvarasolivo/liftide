import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Liftide — Your training, sharpened.',
    short_name: 'Liftide',
    description: 'Your workout log, rest timer, and muscle map. Your sets save automatically to your account.',
    start_url: '/train',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      { src: '/icons/liftide-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/liftide-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/liftide-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
