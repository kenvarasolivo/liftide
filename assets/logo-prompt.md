# Liftide logo

Generated with the built-in ImageGen tool. The original transparent raster mark is saved as `public/icons/liftide-mark.png`. Run `python scripts/build-icons.py` (requires Pillow) to package that original mark without redrawing it:

- `public/icons/liftide-logo.webp`: transparent website mark.
- `public/icons/liftide.ico` and `liftide-32.png`: browser favicons.
- `public/icons/liftide-192.png` and `liftide-512.png`: PWA install icons.
- `public/icons/liftide-maskable-512.png`: launcher icon with mask-safe padding.
- `public/icons/liftide-apple-touch.png`: iPhone and iPad home-screen icon.

All opaque icons use the app's near-black background. Website metadata in `app/layout.tsx` and the manifest in `lib/app-manifest.ts` reference these assets. Rebuild the app after regeneration to refresh the service-worker cache.

## Final prompt

Use case: logo-brand. Create one exceptional production-ready symbol for Liftide, a modern strength-training and workout-log app. A refined abstract mark combining the upward energy of a lift with a flowing tide: two or three bold interlocking curved bands form a distinctive compact rising crest, with subtle suggestion of an L through negative space. Elegant athletic identity, balanced geometry, confident substantial forms, beautiful rounded joins, readable at 24 pixels. Warm peach amber #e6b182 as the sole foreground color, matching a charcoal app. Flat solid graphic, sharp smooth edges, no gradients, no texture, no shadow, no 3D. Single centered symbol only, occupying about 75% of square image, generous even margins. Truly transparent background. No text, no lettering, no arrow icon, no dumbbell clipart, no border, no mockup, no multiple concepts.
