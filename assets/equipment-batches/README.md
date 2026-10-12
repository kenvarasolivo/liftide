# Batched equipment photography

Generated with the built-in imagegen tool for Liftide. Six contact sheets provide
37 individual images, supplementing the nine existing dedicated photographs.
Every built-in exercise now resolves to an individual raster image.

`manifest.json` preserves the final prompts and panel order. `crops.json` records
the exact crop boxes and output dimensions. Original contact sheets are kept
here; optimized app assets live in `public/equipment/catalog/`.

Regenerate the crops with `python scripts/crop-equipment.py` (requires Pillow).
The script detects the white panel dividers and trims them before WebP encoding.
`crop-review.jpg` is a labeled visual review of all 37 crops.

Art direction: photorealistic black equipment, charcoal gym, concrete floor and
warm amber lighting. Exercise demonstrations distinguish movements that use the
same equipment. These are generic AI-generated images, not manufacturer product
photographs or technique instruction.

The eighth panel of sheet 6 is intentionally empty and is not exported.
