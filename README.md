# Skin Vital Lézer Stúdió és Kozmetika – weboldal

Élő: https://skinvital.vercel.app

Statikus, előre renderelt egyoldalas oldal (SEO-barát HTML) kis kliensoldali JS-sel az interaktív részekhez (árkalkulátor, fülek, GYIK, mobil menü).

## Szerkezet

- `design/Main.dc.html` – a terv forrása (sablon + `Component` logika: árak, csomagok, GYIK, árlista).
- `src/runtime.js` – a sablon renderelője (`{{...}}`, `<sc-for>`, `<sc-if>`, `onClick`).
- `src/app.js` – böngészős belépési pont (morphdom-mal frissít).
- `build.mjs` – előrenderel → `public/index.html`, bundle → `public/app.js`; meta, OG, favicon, JSON-LD.
- `assets.json` – a bináris fájlok (WebP képek, ikonok, OG kép) listája sha256 ellenőrzőösszeggel. A build helyi `assets/<útvonal>.b64` fájlból, a meglévő `public/`-ból, vagy a manifestben megadott origin-ről (élő oldal) tölti be és ellenőrzi őket.
- `static/` – változatlanul másolt fájlok (`robots.txt`, `site.webmanifest`).
- `public/` – a build kimenete (nincs gitben); ezt szolgálja ki a Vercel.
- `og/` – az OG-kép (1200×630) forrása: `npm run build`, majd `npm run og` (Playwright kell hozzá); az `og/og.png`-ből készül a `og-image.jpg`.

Új vagy módosított kép/ikon esetén a fájlt base64-ben tedd az `assets/<útvonal>.b64` alá, majd frissítsd az `assets.json` megfelelő sorát (sha256, méret).

## Build és kitétel

```bash
npm install
npm run build              # public/ előállítása
```

A Vercel a `main` ágra pusholt minden commitot automatikusan buildeli és kiteszi (`vercel.json`: `npm run build` → `public/`). Kézi kitétel:

```bash
vercel deploy --prod --scope kolbertai
```

Kanonikus URL: `SITE_URL` környezeti változó (alapértelmezés: https://skinvital.vercel.app). Saját domainnél:

```bash
SITE_URL=https://www.lezeresszortelenitesbudapest.hu npm run build
```
