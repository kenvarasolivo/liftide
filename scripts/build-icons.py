"""Package the ImageGen logo into browser and install icons (requires Pillow)."""
from pathlib import Path
from PIL import Image

destination = Path(__file__).resolve().parent.parent / 'public' / 'icons'
mark = Image.open(destination / 'liftide-mark.png').convert('RGBA')
mark.resize((256, 256), Image.Resampling.LANCZOS).save(destination / 'liftide-mark.webp', quality=90, method=6)
for filename, size, inset in [
    ('icon-192.png', 192, 0),
    ('icon-512.png', 512, 0),
    ('icon-maskable-512.png', 512, 64),
    ('apple-touch-icon.png', 180, 0),
]:
    image = Image.new('RGBA', (size, size), '#17191b')
    fitted = mark.resize((size - inset * 2, size - inset * 2), Image.Resampling.LANCZOS)
    image.alpha_composite(fitted, (inset, inset))
    image.convert('RGB').save(destination / filename, optimize=True)
