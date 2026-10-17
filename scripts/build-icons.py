"""Package the original Liftide logo for web and installation (requires Pillow)."""
from pathlib import Path
from PIL import Image

destination = Path(__file__).resolve().parent.parent / 'public' / 'icons'
mark = Image.open(destination / 'liftide-mark.png').convert('RGBA')
# Fit the actual artwork rather than its transparent source canvas.
mark = mark.crop(mark.getchannel('A').getbbox())
web_mark = Image.new('RGBA', (256, 256))
fitted = mark.copy()
fitted.thumbnail((240, 240), Image.Resampling.LANCZOS)
web_mark.alpha_composite(fitted, ((256 - fitted.width) // 2, (256 - fitted.height) // 2))
web_mark.save(destination / 'liftide-logo.webp', lossless=True, method=6)
for filename, size, inset in [
    ('liftide-192.png', 192, 24),
    ('liftide-512.png', 512, 64),
    # 54% square artwork stays inside the central 80% maskable safe circle.
    ('liftide-maskable-512.png', 512, 118),
    ('liftide-apple-touch.png', 180, 23),
    ('liftide-32.png', 32, 2),
]:
    image = Image.new('RGBA', (size, size), '#09090b')
    fitted = mark.copy()
    fitted.thumbnail((size - inset * 2, size - inset * 2), Image.Resampling.LANCZOS)
    image.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    image.convert('RGB').save(destination / filename, optimize=True)
    if size == 512 and filename == 'liftide-512.png':
        image.save(destination / 'liftide.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
