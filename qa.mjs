import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = EDGE_PATHS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Edge/Chrome executable found. QA audit aborted.');
  process.exit(1);
}

const browser = await puppeteer.launch({ executablePath, headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

const results = [];
const log = (k, v) => { results.push([k, v]); };

async function audit(viewportName, viewport) {
  const page = await browser.newPage();
  const errors = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => failed.push(r.url().slice(0, 90)));

  await page.setViewport(viewport);
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });

  // Scroll through page to trigger lazy loading, then wait for images.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await Promise.race([
      Promise.all(
        [...document.images].map((img) =>
          img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; })
        )
      ),
      new Promise((r) => setTimeout(r, 15000)),
    ]);
  });

  log(`[${viewportName}] console errors`, errors.length ? errors : 'none');
  log(`[${viewportName}] failed requests`, failed.length ? failed : 'none');

  const layout = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, ''));
    const uniqueFonts = [...new Set(fonts)];
    const h1 = document.querySelector('h1');
    const h1s = h1 ? getComputedStyle(h1) : null;
    return {
      overflowX,
      title: document.title.slice(0, 60),
      uniqueFonts,
      h1Font: h1s ? `${h1s.fontFamily.split(',')[0]} / ${h1s.fontSize} / tracking ${h1s.letterSpacing}` : 'MISSING',
      bodyBg: getComputedStyle(document.body).backgroundColor,
      revealHidden: document.querySelectorAll('[data-reveal]:not(.is-revealed)').length,
      imgCount: document.images.length,
      brokenImgs: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src.slice(0, 80)),
    };
  });
  Object.entries(layout).forEach(([k, v]) => log(`[${viewportName}] ${k}`, Array.isArray(v) ? (v.join('; ') || '(empty)') : String(v)));

  if (viewportName === 'mobile') {
    // No horizontal scroll after full render
    log('[mobile] final overflowX', await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }

  await page.close();
}

await audit('desktop', { width: 1440, height: 900 });
await audit('mobile', { width: 390, height: 844, deviceScaleFactor: 2 });

await browser.close();

let pass = 0, fail = 0;
for (const [k, v] of results) {
  const bad = /missing|error|failed|broken/i.test(k) && !/^.*errors.*none$/.test(`${k}${v}`) && v !== 'none' && !(Array.isArray(v) && v.length === 0);
  if (/overflowX/.test(k)) { if (Number(v) > 2) { fail++; console.log(`FAIL  ${k}: ${v}px horizontal overflow`); } else { pass++; console.log(`PASS  ${k}: ${v}px`); } continue; }
  if (bad) { fail++; console.log(`WARN  ${k}: ${v}`); } else { pass++; console.log(`PASS  ${k}: ${v}`); }
}
console.log(`\n${pass} passed, ${fail} flagged`);