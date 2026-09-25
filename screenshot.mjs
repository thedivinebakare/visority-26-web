import puppeteer from 'puppeteer-core';
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
try { process.loadEnvFile(join(ROOT, '.env')); } catch {}
const OUT_DIR = join(ROOT, 'temporary screenshots');

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function findBrowser() {
  return EDGE_PATHS.find((p) => existsSync(p)) || null;
}

const args=process.argv.slice(2);
const url= args.find(a=>/^https?:\/\//.test(a)) || `http://localhost:${process.env.PORT||3000}`;
const label= args.find(a=>!/^https?:\/\//.test(a)) || '';
const isMobile = /mobile|phone|390/i.test(args.join(' '));
const isTablet = /tablet|768|ipad/i.test(args.join(' '));

const viewport = isMobile
  ? { width: 390, height: 844, deviceScaleFactor: 2 }
  : isTablet
    ? { width: 768, height: 1024, deviceScaleFactor: 2 }
    : { width: 1440, height: 900, deviceScaleFactor: 1 };

async function nextShotPath() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = await readdir(OUT_DIR);
  let max = 0;
  for (const f of files) {
    const m = /^screenshot-(\d+)/.exec(f);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const name = label ? `screenshot-${max + 1}-${label}.png` : `screenshot-${max + 1}.png`;
  return join(OUT_DIR, name);
}

const executablePath = findBrowser();
if (!executablePath) {
  console.error('No Edge/Chrome executable found.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

  // Progressively scroll so lazy-loaded images fetch, then wait for decode.
  await page.evaluate(async () => {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.transition = 'none';
    });
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
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
  await new Promise((r) => setTimeout(r, 800));

  const path = await nextShotPath();
  await page.screenshot({ path, fullPage: true });
  console.log(`Saved → ${path}`);
} finally {
  await browser.close();
}