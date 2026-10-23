import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import model from './assets/js/clira-model.js';
import api from './server/clira.cjs';

// 1. Model & Referral Helper Tests
assert.equal(typeof model.getLeadReferral, 'function');
assert.deepEqual(model.getLeadReferral({ referralCode: 'VSR001' }), { type: 'ambassador', code: 'VSR001', name: 'Israelchima', label: 'Israelchima · VSR001' });
assert.deepEqual(model.getLeadReferral({ referralCode: 'vsr002' }), { type: 'ambassador', code: 'VSR002', name: 'MsDebs', label: 'MsDebs · VSR002' });
assert.deepEqual(model.getLeadReferral({ referralCode: 'VSR003' }), { type: 'ambassador', code: 'VSR003', name: 'Chiamaka Ajuzie', label: 'Chiamaka Ajuzie · VSR003' });
assert.deepEqual(model.getLeadReferral({ referralCode: 'VSR004' }), { type: 'ambassador', code: 'VSR004', name: 'Special', label: 'Special · VSR004' });
assert.deepEqual(model.getLeadReferral({ referralCode: 'VSR999' }), { type: 'unknown', code: 'VSR999', name: 'Unknown referral', label: 'Unknown · VSR999' });
assert.deepEqual(model.getLeadReferral({}), { type: 'direct', code: '', name: 'Direct', label: 'Direct' });
assert.deepEqual(model.getLeadReferral({ ambassadorName: 'Israelchima' }), { type: 'ambassador', code: 'VSR001', name: 'Israelchima', label: 'Israelchima · VSR001' });

// 2. Server mapRow test
const mappedIsrael = api.mapRow({ 'Name': 'Tomiwa', 'Referral Code': 'VSR001' });
assert.equal(mappedIsrael.referralCode, 'VSR001');
assert.equal(mappedIsrael.ambassadorName, 'Israelchima');

const mappedSpecial = api.mapRow({ 'Name': 'Kalu', 'Referral Code': 'VSR004' });
assert.equal(mappedSpecial.referralCode, 'VSR004');
assert.equal(mappedSpecial.ambassadorName, 'Special');

const mappedDirect = api.mapRow({ 'Name': 'Samuel' });
assert.equal(mappedDirect.referralCode, '');
assert.equal(mappedDirect.ambassadorName, '');

// 3. Future addition test (Section 16 requirement)
const testAmbassadorsFile = await import('./assets/js/ambassadors.js');
assert.equal(typeof testAmbassadorsFile.default?.resolve || typeof testAmbassadorsFile.resolve, 'function');

// 4. Browser E2E Tests covering all acceptance requirements
const base = 'http://localhost:3019';
const server = spawn(process.execPath, ['serve.mjs'], {
  env: { ...process.env, PORT: '3019', PUBLIC_SITE_URL: base },
  stdio: 'ignore',
  windowsHide: true,
});

let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  await mkdir('temporary screenshots', { recursive: true });
  browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    userDataDir: await mkdtemp('temporary screenshots/clira-ambassador-'),
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  const testLeads = [
    { rowNumber: 2, name: 'Israelchima Lead 1', email: 'israel1@test.com', phone: '08011111111', role: 'Founder', ticket: 'standard', status: 'Registered', referralCode: 'VSR001', ambassadorName: 'Israelchima' },
    { rowNumber: 3, name: 'Israelchima Lead 2', email: 'israel2@test.com', phone: '08011111112', role: 'Creative', ticket: 'vip', status: 'New', referralCode: 'VSR001', ambassadorName: 'Israelchima' },
    { rowNumber: 4, name: 'MsDebs VIP', email: 'msdebs1@test.com', phone: '08022222221', role: 'Professional', ticket: 'vip', status: 'Follow Up', referralCode: 'VSR002', ambassadorName: 'MsDebs' },
    { rowNumber: 5, name: 'Rachel Chiamaka', email: 'rachel@test.com', phone: '08033333331', role: 'Creator', ticket: 'standard', status: 'Contacted', referralCode: 'VSR003', ambassadorName: 'Chiamaka Ajuzie' },
    { rowNumber: 6, name: 'Special VIP', email: 'special@test.com', phone: '08033333332', role: 'Founder', ticket: 'vip', status: 'Registered', referralCode: 'VSR004', ambassadorName: 'Special' },
    { rowNumber: 7, name: 'Direct Lead 1', email: 'direct1@test.com', phone: '08044444441', role: 'Creative', ticket: 'standard', status: 'Registered', referralCode: '', ambassadorName: '' },
    { rowNumber: 8, name: 'Direct Lead 2', email: 'direct2@test.com', phone: '08044444442', role: 'Founder', ticket: 'vip', status: 'New', referralCode: '', ambassadorName: '' },
    { rowNumber: 9, name: 'Unknown Ref Lead', email: 'unknown@test.com', phone: '08055555551', role: 'Other', ticket: 'standard', status: 'New', referralCode: 'VSR999', ambassadorName: '' },
  ];

  await page.setRequestInterception(true);
  page.on('request', async r => {
    if (r.url().includes('/api/clira-leads')) {
      if (r.headers()['x-clira-key'] !== 'test-key') {
        return r.respond({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ leads: testLeads, demo: true, syncedAt: new Date().toISOString() }) });
    }
    r.continue();
  });

  // Desktop viewport
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/clira/');
  await page.type('#key', 'test-key');
  await page.click('#unlock');
  await page.waitForSelector('.lead-row');

  // Verify all leads initially visible
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Section 40: Verify summary counts match test leads with real names
  const summaryText = await page.$eval('#ambassador-summary', el => el.textContent);
  assert(summaryText.includes('Israelchima 2'), 'Israelchima count should be 2');
  assert(summaryText.includes('MsDebs 1'), 'MsDebs count should be 1');
  assert(summaryText.includes('Chiamaka Ajuzie 1'), 'Chiamaka Ajuzie count should be 1');
  assert(summaryText.includes('Special 1'), 'Special count should be 1');
  assert(summaryText.includes('Direct 2'), 'Direct count should be 2');

  // Section 35: Acceptance Test VSR001 (Israelchima)
  await page.select('#ambassador-filter', 'VSR001');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 2);
  // Select MsDebs -> Israelchima leads disappear
  await page.select('#ambassador-filter', 'VSR002');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  // Switch back to Israelchima & open lead detail
  await page.select('#ambassador-filter', 'VSR001');
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  let detailAnswers = await page.$eval('#answers', el => el.textContent);
  assert(detailAnswers.includes('Referred by'), 'detail has Referred by label');
  assert(detailAnswers.includes('Israelchima · VSR001'), 'detail shows Israelchima · VSR001');
  await page.screenshot({ path: 'temporary screenshots/clira-detail-desktop.png' });
  await page.click('#close-detail');

  // Section 36: Acceptance Test VSR002 (MsDebs)
  await page.select('#ambassador-filter', 'VSR002');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  detailAnswers = await page.$eval('#answers', el => el.textContent);
  assert(detailAnswers.includes('MsDebs · VSR002'), 'detail shows MsDebs · VSR002');
  await page.click('#close-detail');

  // Section 37: Acceptance Test VSR003 (Chiamaka Ajuzie)
  await page.select('#ambassador-filter', 'VSR003');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  detailAnswers = await page.$eval('#answers', el => el.textContent);
  assert(detailAnswers.includes('Chiamaka Ajuzie · VSR003'), 'detail shows Chiamaka Ajuzie · VSR003');
  await page.click('#close-detail');

  // Section 3: Acceptance Test VSR004 (Special)
  await page.select('#ambassador-filter', 'VSR004');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  detailAnswers = await page.$eval('#answers', el => el.textContent);
  assert(detailAnswers.includes('Special · VSR004'), 'detail shows Special · VSR004');
  await page.click('#close-detail');

  // Section 38: Direct Test
  await page.select('#ambassador-filter', 'Direct');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 2);
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  detailAnswers = await page.$eval('#answers', el => el.textContent);
  assert(detailAnswers.includes('Direct'), 'detail shows Direct');
  assert(!detailAnswers.includes('null') && !detailAnswers.includes('undefined') && !detailAnswers.includes('N/A'));
  await page.click('#close-detail');

  // Reset ambassador to All
  await page.select('#ambassador-filter', 'All');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Section 39: Combined filter tests
  // A. Ambassador = Israelchima + Status = Registered
  await page.select('#ambassador-filter', 'VSR001');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#filters button')];
    const reg = btns.find(b => b.textContent.trim() === 'Registered');
    if (reg) reg.click();
  });
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.$eval('.lead-row strong', el => el.textContent), 'Israelchima Lead 1');

  // Reset status to All
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#filters button')];
    const all = btns.find(b => b.textContent.trim() === 'All');
    if (all) all.click();
  });

  // B. Ambassador = MsDebs + Pass = Premium
  await page.select('#ambassador-filter', 'VSR002');
  await page.click(".seg-tab[data-seg='Premium']");
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.$eval('.lead-row strong', el => el.textContent), 'MsDebs VIP');

  // Reset pass segment to All
  await page.click(".seg-tab[data-seg='All']");

  // C. Ambassador = Chiamaka Ajuzie + Search = Rachel
  await page.select('#ambassador-filter', 'VSR003');
  await page.type('#search', 'Rachel');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.$eval('.lead-row strong', el => el.textContent), 'Rachel Chiamaka');

  // Clear search and reset ambassador filter
  await page.$eval('#search', el => { el.value = ''; el.dispatchEvent(new Event('input')); });
  await page.select('#ambassador-filter', 'All');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Section 33: Summary pill clicking
  // Click Israelchima pill
  await page.evaluate(() => {
    const pills = [...document.querySelectorAll('.ambassador-pill')];
    const pill = pills.find(p => p.textContent.includes('Israelchima'));
    if (pill) pill.click();
  });
  assert.equal(await page.$eval('#ambassador-filter', el => el.value), 'VSR001');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 2);

  // Click Israelchima pill again to toggle back to All
  await page.evaluate(() => {
    const pills = [...document.querySelectorAll('.ambassador-pill')];
    const pill = pills.find(p => p.textContent.includes('Israelchima'));
    if (pill) pill.click();
  });
  assert.equal(await page.$eval('#ambassador-filter', el => el.value), 'All');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Section 41: Refresh test
  await page.click('#refresh');
  await page.waitForFunction(() => !document.querySelector('#refresh').disabled);
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Capture desktop screenshot
  await page.screenshot({ path: 'temporary screenshots/clira-desktop-ambassadors.png', fullPage: true });

  // Section 42: Mobile test at 390px
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no mobile horizontal overflow');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Filter on mobile (Special VSR004)
  await page.select('#ambassador-filter', 'VSR004');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no overflow while filtered');

  // Open lead on mobile
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  assert.equal(await page.evaluate(() => {
    const d = document.querySelector('#detail');
    return d.scrollWidth > d.clientWidth;
  }), false, 'no mobile drawer overflow');
  detailAnswers = await page.$eval('#answers', el => el.textContent);
  assert(detailAnswers.includes('Special · VSR004'), 'mobile detail shows Special · VSR004');
  await page.screenshot({ path: 'temporary screenshots/clira-detail-mobile.png' });
  await page.click('#close-detail');

  // Reset filter on mobile and screenshot
  await page.select('#ambassador-filter', 'All');
  await page.screenshot({ path: 'temporary screenshots/clira-mobile-ambassadors.png', fullPage: true });

  assert.deepEqual(errors, [], 'no browser runtime console/page errors');
  console.log('PASS ALL ACCEPTANCE TESTS: VSR001 (Israelchima), VSR002 (MsDebs), VSR003 (Chiamaka Ajuzie), VSR004 (Special), Direct, combined filters, search, counts, pill toggle, refresh, mobile 390px, screenshots.');
} finally {
  await browser?.close();
  server.kill();
}
