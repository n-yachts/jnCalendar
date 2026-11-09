"""
Vytvoří ikony aplikace do icons/ (kalendář s fajfkou).

    pip install pillow
    python tools/icons.py

icon-192/512.png  – běžné ikony (zaoblený čtverec)
maskable-512.png  – ikona pro Android (celoplošné pozadí, motiv v bezpečné zóně)
apple-touch-icon.png (180 px), favicon-32.png
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'icons')
BG = (31, 95, 139)        # --accent
PAGE = (255, 255, 255)
BAND = (232, 99, 74)
RING = (13, 47, 71)
CHECK = (47, 158, 91)
SS = 4                    # převzorkování kvůli hladkým hranám


def draw_icon(size, maskable=False, rounded=True):
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=BG)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BG)

    # Motiv kreslíme v souřadnicích 0–1; u maskable ikony ho zmenšíme do bezpečné zóny (80 %).
    scale = 0.9 if maskable else 1.0
    off = (1 - scale) / 2

    def P(x, y):
        return (int((off + x * scale) * S), int((off + y * scale) * S))

    def R(x0, y0, x1, y1, r, fill):
        a, b = P(x0, y0), P(x1, y1)
        d.rounded_rectangle([a, b], radius=int(r * scale * S), fill=fill)

    R(0.22, 0.27, 0.78, 0.80, 0.06, PAGE)          # list kalendáře
    R(0.22, 0.27, 0.78, 0.42, 0.06, BAND)          # záhlaví
    d.rectangle([P(0.22, 0.36), P(0.78, 0.42)], fill=BAND)
    R(0.34, 0.20, 0.40, 0.33, 0.03, RING)          # kroužky
    R(0.60, 0.20, 0.66, 0.33, 0.03, RING)
    w = int(0.065 * scale * S)                     # fajfka
    pts = [P(0.35, 0.60), P(0.46, 0.70), P(0.66, 0.50)]
    d.line(pts, fill=CHECK, width=w, joint='curve')
    for x, y in pts[::2]:
        d.ellipse([x - w // 2, y - w // 2, x + w // 2, y + w // 2], fill=CHECK)
    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    draw_icon(192).save(os.path.join(OUT, 'icon-192.png'))
    draw_icon(512).save(os.path.join(OUT, 'icon-512.png'))
    draw_icon(512, maskable=True).save(os.path.join(OUT, 'maskable-512.png'))
    draw_icon(180, rounded=False).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
    draw_icon(32).save(os.path.join(OUT, 'favicon-32.png'))
    print('Ikony uloženy do', OUT)


if __name__ == '__main__':
    main()
