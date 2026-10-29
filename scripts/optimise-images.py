"""Makes a WebP copy of each picture under public/images, next to the original.

- PNG: lossless WebP (the same pixels, smaller file).
- JPEG: WebP at quality 92.
- GIF: animated lossless WebP (every pixel kept).

A copy is written only when it is smaller than the original. The originals are kept.
src/config/images-webp.json lists the originals that have a copy; the site uses the copy.
Run from the repository root:  python3 scripts/optimise-images.py   (needs Pillow)
"""

import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "public" / "images"
MAP = ROOT / "src" / "config" / "images-webp.json"
SOURCES = {".png", ".jpg", ".jpeg", ".gif"}


def save_static(src: Path, dst: Path, lossless: bool, quality: int):
    with Image.open(src) as im:
        im.load()
        im = im.convert("RGBA") if im.mode in ("P", "LA") or "transparency" in im.info else im
        im.save(dst, "WEBP", lossless=lossless, quality=quality, method=6)


def save_animated(src: Path, dst: Path, lossless: bool, quality: int):
    # Animated WebP encodes slowly at the highest effort, so these use a faster setting.
    with Image.open(src) as im:
        frames = [f.convert("RGBA") for f in ImageSequence.Iterator(im)]
        durations = [f.info.get("duration", 100) for f in ImageSequence.Iterator(im)]
        loop = im.info.get("loop", 0)
    frames[0].save(
        dst,
        "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=loop,
        lossless=lossless,
        quality=quality,
        method=2,
    )


def convert(src: Path) -> str | None:
    dst = src.with_suffix(".webp")
    ext = src.suffix.lower()
    with Image.open(src) as im:
        animated = getattr(im, "is_animated", False) and im.n_frames > 1
    tries = []
    if ext == ".gif" and animated:
        # Lossless: every pixel stays exactly as it was (about half the GIF's size).
        tries = [("lossless", lambda d: save_animated(src, d, True, 100))]
    elif ext == ".png":
        tries = [("lossless", lambda d: save_static(src, d, True, 100))]
    else:  # jpeg, or a still gif
        tries = [("lossy", lambda d: save_static(src, d, False, 92))]
    best = None
    for name, fn in tries:
        tmp = dst.with_name(f"{dst.stem}.{name}.tmp.webp")  # one file per attempt
        fn(tmp)
        size = tmp.stat().st_size
        if best is None or size < best[1]:
            if best:
                best[2].unlink(missing_ok=True)
            best = (name, size, tmp)
        else:
            tmp.unlink(missing_ok=True)
    name, size, tmp = best
    if size >= src.stat().st_size:
        tmp.unlink(missing_ok=True)
        return None
    os.replace(tmp, dst)
    print(f"{src.relative_to(ROOT)}: {src.stat().st_size} -> {size} bytes ({name})")
    return str(src.relative_to(IMAGES)).replace(os.sep, "/")


def main():
    have = []
    for src in sorted(IMAGES.rglob("*")):
        if not src.is_file() or src.suffix.lower() not in SOURCES:
            continue
        if src.with_suffix(".webp").exists() and src.with_suffix(".webp").stat().st_mtime > src.stat().st_mtime:
            have.append(str(src.relative_to(IMAGES)).replace(os.sep, "/"))
            continue
        rel = convert(src)
        if rel:
            have.append(rel)
    MAP.write_text(json.dumps(sorted(set(have)), indent=2) + "\n")
    print(f"{len(set(have))} files have a WebP copy -> {MAP.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
