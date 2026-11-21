#!/usr/bin/env python3
"""Накладывает логотип CITY на фото объекта как слабый водяной знак.

Использование:
    python tools/watermark.py исходное.jpg assets/имя-объекта.jpg

Нужна библиотека Pillow (pip install pillow). Логотип берётся из assets/city-logo-mark.png.
Исходный файл не меняется, результат записывается в новый файл.
"""
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

LOGO = Path(__file__).resolve().parent.parent / "assets" / "city-logo-mark.png"
WIDTH_SHARE = 0.22   # ширина знака относительно ширины фото
OPACITY = 0.50       # прозрачность знака (1 = непрозрачный)
MARGIN_SHARE = 0.05   # отступ от правого края относительно ширины фото
BOTTOM_SHARE = 0.085  # отступ снизу: запас, чтобы знак не обрезался при показе фото в формате 4:5


def add_watermark(src: Path, dst: Path) -> None:
    photo = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w, h = photo.size

    logo = Image.open(LOGO).convert("RGBA")
    lw = max(1, int(w * WIDTH_SHARE))
    lh = max(1, int(logo.height * lw / logo.width))
    logo = logo.resize((lw, lh), Image.LANCZOS)

    # слабая тень, чтобы знак читался и на светлом, и на тёмном фоне
    alpha = logo.getchannel("A")
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(max(2, lw // 40))).point(lambda v: int(v * 0.45 * OPACITY))
    shadow = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    shadow.putalpha(shadow_alpha)

    logo.putalpha(alpha.point(lambda v: int(v * OPACITY)))

    margin = int(w * MARGIN_SHARE)
    pos = (w - lw - margin, h - lh - int(w * BOTTOM_SHARE))

    canvas = photo.convert("RGBA")
    canvas.alpha_composite(shadow, (pos[0] + 2, pos[1] + 3))
    canvas.alpha_composite(logo, pos)
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(dst, "JPEG", quality=88, optimize=True, progressive=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    add_watermark(Path(sys.argv[1]), Path(sys.argv[2]))
    print("Готово:", sys.argv[2])
