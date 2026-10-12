import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Liftide — Your training, sharpened.',
    short_name: 'Liftide',
    description: 'Your workout log, rest timer, and muscle map. Train at your own pace, even offline.',
    start_url: '/train',
    scope: '/',
    display: 'standalone',
    background_color: '#17191b',
    theme_color: '#17191b',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
