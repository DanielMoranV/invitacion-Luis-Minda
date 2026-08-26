#!/usr/bin/env python3
"""Genera img/mapa-ubicacion.jpg a partir de tiles de OpenStreetMap.

Usa las coordenadas de la iglesia y del local de recepción definidas en
src/content/evento.json. Requiere `pillow` y `requests` (pip install
pillow requests). Volver a correr cada vez que cambien esas coordenadas.
"""
import io
import json
import math
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
EVENTO_PATH = ROOT / "src" / "content" / "evento.json"
OUT_PATH = ROOT / "img" / "mapa-ubicacion.jpg"

ZOOM = 18
W, H = 900, 600
TILE = 256
HEADERS = {"User-Agent": "invitacion-luis-minda-astro-build/1.0"}


def deg2px(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    x = (lon_deg + 180.0) / 360.0 * n * TILE
    y = (1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n * TILE
    return x, y


def fetch_tile(session, tx, ty):
    url = f"https://tile.openstreetmap.org/{ZOOM}/{tx}/{ty}.png"
    for attempt in range(3):
        try:
            r = session.get(url, timeout=10)
            if r.status_code == 200:
                return Image.open(io.BytesIO(r.content)).convert("RGB")
        except requests.RequestException:
            pass
        time.sleep(0.5)
    return None


def draw_pin(draw, pos, fill, ring):
    x, y = pos
    draw.ellipse([x - 11, y - 11, x + 11, y + 11], fill=ring)
    draw.ellipse([x - 6, y - 6, x + 6, y + 6], fill=fill, outline="#ffffff", width=2)


def main():
    evento = json.loads(EVENTO_PATH.read_text())
    lugar = evento["lugar"]
    puntos = [(lugar["coordenadas"]["lat"], lugar["coordenadas"]["lng"], "#23448f")]
    if lugar.get("recepcion"):
        c = lugar["recepcion"]["coordenadas"]
        puntos.append((c["lat"], c["lng"], "#1b2540"))

    px_puntos = [(*deg2px(lat, lng, ZOOM), color) for lat, lng, color in puntos]
    px_mid = sum(p[0] for p in px_puntos) / len(px_puntos)
    py_mid = sum(p[1] for p in px_puntos) / len(px_puntos)

    canvas_origin_x = px_mid - W / 2
    canvas_origin_y = py_mid - H / 2

    min_tile_x = math.floor(canvas_origin_x / TILE)
    max_tile_x = math.floor((canvas_origin_x + W) / TILE)
    min_tile_y = math.floor(canvas_origin_y / TILE)
    max_tile_y = math.floor((canvas_origin_y + H) / TILE)

    stitched = Image.new(
        "RGB",
        ((max_tile_x - min_tile_x + 1) * TILE, (max_tile_y - min_tile_y + 1) * TILE),
        "#e9eff6",
    )

    session = requests.Session()
    session.headers.update(HEADERS)
    for tx in range(min_tile_x, max_tile_x + 1):
        for ty in range(min_tile_y, max_tile_y + 1):
            tile = fetch_tile(session, tx, ty)
            if tile:
                stitched.paste(tile, ((tx - min_tile_x) * TILE, (ty - min_tile_y) * TILE))
            time.sleep(0.2)

    left = round(canvas_origin_x - min_tile_x * TILE)
    top = round(canvas_origin_y - min_tile_y * TILE)
    final = stitched.crop((left, top, left + W, top + H))

    draw = ImageDraw.Draw(final)
    for px, py, color in px_puntos:
        draw_pin(draw, (px - canvas_origin_x, py - canvas_origin_y), color, color + "55")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    final.convert("RGB").save(OUT_PATH, quality=88)
    print(f"saved {OUT_PATH} {final.size}")


if __name__ == "__main__":
    main()
