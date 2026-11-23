"""Sample the scene posters for the review sheet and the inline backdrop (requires FFmpeg)."""

from base64 import b64encode
from collections import Counter
from itertools import groupby
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "previews" / "landscape-dots"


def sample(poster, width, height):
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(poster),
        "-vf", f"scale={width}:{height}:flags=area", "-frames:v", "1",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ])
    pixels = list(zip(*[iter(raw)] * 3))
    counts = Counter(pixels)
    boxes = [list(counts)]
    for _ in range(15):
        # Split the busiest colour range at its weighted median.
        def spread(box):
            return [max(values) - min(values) for values in zip(*box)]

        box = max(boxes, key=lambda b: max(spread(b)) * sum(counts[c] for c in b))
        boxes.remove(box)
        channel = max(range(3), key=spread(box).__getitem__)
        box.sort(key=lambda c: c[channel])
        half = sum(counts[c] for c in box) / 2
        weight = 0
        for i, color in enumerate(box[:-1], 1):
            weight += counts[color]
            if weight >= half:
                break
        boxes.extend((box[:i], box[i:]))
    palette = []
    indices = {}
    for index, box in enumerate(boxes):
        total = sum(counts[c] for c in box)
        palette.extend(round(sum(c[k] * counts[c] for c in box) / total) for k in range(3))
        indices.update(dict.fromkeys(box, index))
    runs = bytearray()
    for index, group in groupby(indices[c] for c in pixels):
        count = sum(1 for _ in group)
        while count:
            size = min(16, count)
            runs.append((size - 1) << 4 | index)
            count -= size
    return [width, height, bytes(palette).hex(), b64encode(runs).decode("ascii")]


if __name__ == "__main__":
    samples = {}
    for season in ("spring", "summer", "autumn", "winter"):
        path = ROOT / "public" / "scenes" / f"poster-{season}-day-wide.webp"
        samples[season] = sample(path, 144, 72)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "samples.js").write_text(
        "const samples = " + json.dumps(samples, separators=(",", ":")) + "\n", encoding="ascii"
    )
    # Only the four default-season variants belong in the critical HTML.
    winter, others = {}, {}
    for path in sorted((ROOT / "public" / "scenes").glob("poster-*.webp")):
        key = path.stem.removeprefix("poster-")
        grid = (36, 72) if key.endswith("mobile") else (80, 40)
        target = winter if key.startswith("winter-") else others
        target[key] = sample(path, *grid)
    for name, data in (("winter", winter), ("seasons", others)):
        (ROOT / "src" / "assets" / f"dots-{name}.json").write_text(
            json.dumps(data, separators=(",", ":")) + "\n", encoding="ascii"
        )
