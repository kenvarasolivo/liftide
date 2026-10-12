"""Crop generated contact sheets into the app's individual WebP photos.

Run from the repository root with Python and Pillow installed.
The user requested batched generation followed by deterministic cropping.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BATCHES = ROOT / 'assets/equipment-batches'
OUTPUT = ROOT / 'public/equipment/catalog'


def dividers(image, count, axis):
    """Find near-white grid rules near the expected equal panel boundaries."""
    length = image.width if axis == 'x' else image.height
    cross = image.height if axis == 'x' else image.width
    pixels = image.load()
    cuts = [0]
    for i in range(1, count):
        expected = round(length * i / count)
        scores = []
        for pos in range(max(0, expected - length // 10), min(length, expected + length // 10)):
            bright = sum(min(pixels[pos, p] if axis == 'x' else pixels[p, pos]) > 210 for p in range(0, cross, 3))
            scores.append((bright, -abs(pos - expected), pos))
        best = max(scores)
        cuts.append(best[2] if best[0] > cross / 3 * .7 else expected)
    return cuts + [length]


OUTPUT.mkdir(parents=True, exist_ok=True)
metadata = []
for batch in json.loads((BATCHES / 'manifest.json').read_text()):
    image = Image.open(BATCHES / batch['sheet']).convert('RGB')
    xs, ys = dividers(image, batch['columns'], 'x'), dividers(image, batch['rows'], 'y')
    for index, name in enumerate(batch['ids']):
        col, row = index % batch['columns'], index // batch['columns']
        # Remove the grid rule, without cutting into the subject.
        box = (xs[col] + 5, ys[row] + 5, xs[col + 1] - 5, ys[row + 1] - 5)
        tile = image.crop(box)
        tile.thumbnail((768, 768), Image.Resampling.LANCZOS)
        tile.save(OUTPUT / f'{name}.webp', 'WEBP', quality=88, method=6)
        metadata.append({'id': name, 'sheet': batch['sheet'], 'crop': box, 'size': tile.size})
(BATCHES / 'crops.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(f'Cropped {len(metadata)} equipment photos into {OUTPUT}')
