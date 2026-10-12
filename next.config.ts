import type { NextConfig } from 'next';
const config: NextConfig = { images: { unoptimized: true }, devIndicators: false, async headers() { return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }]; } };
export default config;
