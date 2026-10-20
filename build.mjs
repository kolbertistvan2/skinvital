import crypto from 'node:crypto';
import fs from 'node:fs';
import { parseHTML } from 'linkedom';
import * as esbuild from 'esbuild';
import { createRenderer, DCLogic } from './src/runtime.js';

const SRC = process.argv[2] || './design/Main.dc.html';
const SITE = process.env.SITE_URL || 'https://skinvital.vercel.app';

// Binary assets (images, icons, OG image) are listed in assets.json with sha256.
// Source order: local assets/<path>.b64 (base64 text) -> public/<path> already present -> download from manifest origin.
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name])) : []);
fs.mkdirSync('./public', { recursive: true });
const manifest = JSON.parse(fs.readFileSync('./assets.json', 'utf8'));
const origin = process.env.ASSET_ORIGIN || manifest.origin;
for (const a of manifest.files) {
  const out = './public/' + a.path;
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  const ok = (buf) => crypto.createHash('sha256').update(buf).digest('hex') === a.sha256;
  const b64 = './assets/' + a.path + '.b64';
  let buf = fs.existsSync(b64) ? Buffer.from(fs.readFileSync(b64, 'utf8'), 'base64') : fs.existsSync(out) ? fs.readFileSync(out) : null;
  if (!buf || !ok(buf)) {
    const res = await fetch(origin + '/' + a.path);
    if (!res.ok) throw new Error('asset download failed: ' + a.path + ' ' + res.status);
    buf = Buffer.from(await res.arrayBuffer());
    if (!ok(buf)) throw new Error('asset checksum mismatch: ' + a.path);
  }
  fs.writeFileSync(out, buf);
}
for (const f of walk('./static')) fs.copyFileSync(f, './public/' + f.slice('./static/'.length));
const raw = fs.readFileSync(SRC, 'utf8');
const map = JSON.parse(fs.readFileSync('./img-map.json', 'utf8'));

const between = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('missing ' + a); return s.slice(i + a.length, j); };
let helmet = between(raw, '<helmet>', '</helmet>');
let tpl = between(raw.slice(raw.indexOf('</helmet>')), '</helmet>', '</x-dc>');
const script = between(raw, 'data-dc-script', '</script>').replace(/^[^>]*>/, '');

// image paths + intrinsic sizes for CLS
const fixImgs = (html) => html
  .replace(/<img([^>]*?)src="\/_blob\/([0-9a-f]{32})"([^>]*)>/g, (m, a, id, b) => {
    const e = map[id]; if (!e) throw new Error('no image ' + id);
    const attrs = a + b;
    const sz = /\swidth=/.test(attrs) ? '' : ` width="${e.w}" height="${e.h}"`;
    const lazy = /loading=/.test(attrs) ? '' : ' loading="lazy" decoding="async"';
    return `<img${a}src="${e.file}"${sz}${lazy}${b}>`;
  })
  .replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => { if (!map[id]) throw new Error('no image ' + id); return map[id].file; });
tpl = fixImgs(tpl);
helmet = fixImgs(helmet);
// first images (logo, hero) load eagerly
let eagerCount = 0;
tpl = tpl.replace(/ loading="lazy" decoding="async"/g, (m) => (eagerCount++ < 2 ? ' fetchpriority="high"' : m));

// component module
const compSrc = `import { DCLogic } from './runtime.js';\n${script}\nexport default Component;\n`;
fs.writeFileSync('./src/component.js', compSrc);
fs.writeFileSync('./src/template.js', 'export default ' + JSON.stringify(tpl) + ';\n');

// prerender
const { document } = parseHTML('<!doctype html><html><body><template id="t"></template></body></html>');
const holder = document.createElement('div');
holder.innerHTML = tpl;
const Component = new Function('DCLogic', script + '\nreturn Component;')(DCLogic);
const comp = new Component({});
const r = createRenderer();
const body = r.render(Array.from(holder.childNodes), comp.renderVals());

const title = 'Lézeres szőrtelenítés Budapest, Kispest | Skin Vital Lézer Stúdió';
const desc = 'Végleges, fájdalommentes lézeres szőrtelenítés Elysion Pro diódalézerrel, kizárólag hölgyeknek Kispesten. HIFU és prémium arckezelések, ingyenes konzultáció.';
const ld = {
  '@context': 'https://schema.org', '@type': 'BeautySalon',
  name: 'Skin Vital Lézer Stúdió és Kozmetika', url: SITE, image: SITE + '/og-image.jpg', logo: SITE + '/img/logo.png',
  telephone: '+36206178951', email: 'skinvital.kozmetika@gmail.com', priceRange: '11 000 Ft-tól',
  address: { '@type': 'PostalAddress', streetAddress: 'Toldy u. 19. 2/6.', addressLocality: 'Budapest', postalCode: '1191', addressCountry: 'HU' },
  hasMap: 'https://maps.app.goo.gl/n5dcDMH4pwyh548D8',
  sameAs: ['https://skin-vital.salonic.hu/']
};

const html = `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${SITE}/">
<meta name="theme-color" content="#0F4B4E">
<meta property="og:type" content="website">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="Skin Vital Lézer Stúdió és Kozmetika">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${SITE}/">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Skin Vital Lézer Stúdió: végleges szőrtelenítés Elysion Pro diódalézerrel">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${SITE}/og-image.jpg">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>img{height:auto}</style>
${helmet.trim()}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<div id="app">${body}</div>
<script src="/app.js" defer></script>
</body>
</html>
`;
fs.mkdirSync('./public', { recursive: true });
fs.writeFileSync('./public/index.html', html);
await esbuild.build({ entryPoints: ['./src/app.js'], bundle: true, minify: true, format: 'iife', target: 'es2019', outfile: './public/app.js' });
console.log('index.html', (html.length / 1024).toFixed(0), 'KB; app.js', (fs.statSync('./public/app.js').size / 1024).toFixed(0), 'KB');
