# OG kép (1200x630) renderelése: python3 og/shoot.py, majd og/og.png -> og-image.jpg
from pathlib import Path
from playwright.sync_api import sync_playwright
here = Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    pg.goto((here / 'og.html').as_uri())
    pg.wait_for_timeout(2500)
    pg.screenshot(path=str(here / 'og.png'))
    b.close()
