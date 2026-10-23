import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import model from './assets/js/clira-model.js';
import api from './server/clira.cjs';

// 1. Model & Referral Helper Tests
assert.equal(typeof model.getLeadReferral, 'function');
assert.deepEqual(model.getLeadReferral({ referralCode: 'VSR001' }), { type: 'ambassador', code: 'VSR001', name: 'Eniola', label: 'Eniola · VSR001' });
assert.deepEqual(model.getLeadReferral({ referralCode: 'vsr002' }), { type: 'ambassador', code: 'VSR002', name: 'Deborah', label: 'Deborah · VSR002' });
assert.deepEqual(model.getLeadReferral({ referralCode: 'VSR003' }), { type: 'ambassador', code: 'VSR003', name: 'Divine', label: 'Divine · VSR003' });
assert.deepEqual(model.getLeadReferral({ referralCode: 'VSR999' }), { type: 'unknown', code: 'VSR999', name: 'Unknown referral', label: 'Unknown · VSR999' });
assert.deepEqual(model.getLeadReferral({}), { type: 'direct', code: '', name: 'Direct', label: 'Direct' });
assert.deepEqual(model.getLeadReferral({ ambassadorName: 'Eniola' }), { type: 'ambassador', code: 'VSR001', name: 'Eniola', label: 'Eniola · VSR001' });

// 2. Server mapRow test
const mappedEniola = api.mapRow({ 'Name': 'Tomiwa', 'Referral Code': 'VSR001' });
assert.equal(mappedEniola.referralCode, 'VSR001');
assert.equal(mappedEniola.ambassadorName, 'Eniola');

const mappedDirect = api.mapRow({ 'Name': 'Samuel' });
assert.equal(mappedDirect.referralCode, '');
assert.equal(mappedDirect.ambassadorName, '');

// 3. Browser E2E Tests covering all acceptance requirements
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
    { rowNumber: 2, name: 'Eniola Fan 1', email: 'eniola1@test.com', phone: '08011111111', role: 'Founder', ticket: 'standard', status: 'Registered', referralCode: 'VSR001', ambassadorName: 'Eniola' },
    { rowNumber: 3, name: 'Eniola Fan 2', email: 'eniola2@test.com', phone: '08011111112', role: 'Creative', ticket: 'vip', status: 'New', referralCode: 'VSR001', ambassadorName: 'Eniola' },
    { rowNumber: 4, name: 'Deborah VIP', email: 'deborah1@test.com', phone: '08022222221', role: 'Professional', ticket: 'vip', status: 'Follow Up', referralCode: 'VSR002', ambassadorName: 'Deborah' },
    { rowNumber: 5, name: 'Rachel Divine', email: 'rachel@test.com', phone: '08033333331', role: 'Creator', ticket: 'standard', status: 'Contacted', referralCode: 'VSR003', ambassadorName: 'Divine' },
    { rowNumber: 6, name: 'Divine Fan 2', email: 'divine2@test.com', phone: '08033333332', role: 'Founder', ticket: 'vip', status: 'Registered', referralCode: 'VSR003', ambassadorName: 'Divine' },
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

  // Section 40: Verify summary counts match test leads
  const summaryText = await page.$eval('#ambassador-summary', el => el.textContent);
  assert(summaryText.includes('Eniola 2'), 'Eniola count should be 2');
  assert(summaryText.includes('Deborah 1'), 'Deborah count should be 1');
  assert(summaryText.includes('Divine 2'), 'Divine count should be 2');
  assert(summaryText.includes('Direct 2'), 'Direct count should be 2');

  // Section 35: Acceptance Test VSR001 (Eniola)
  await page.select('#ambassador-filter', 'VSR001');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 2);
  // Select Deborah -> Eniola leads disappear
  await page.select('#ambassador-filter', 'VSR002');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  // Switch back to Eniola & open lead detail
  await page.select('#ambassador-filter', 'VSR001');
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  const detailAnswers = await page.$eval('#answers', el => el.textContent);
  assert(detailAnswers.includes('Referred by'), 'detail has Referred by label');
  assert(detailAnswers.includes('Eniola · VSR001'), 'detail shows Eniola · VSR001');
  await page.screenshot({ path: 'temporary screenshots/clira-detail-desktop.png' });
  await page.click('#close-detail');

  // Section 36: Acceptance Test VSR002 (Deborah)
  await page.select('#ambassador-filter', 'VSR002');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  const debAnswers = await page.$eval('#answers', el => el.textContent);
  assert(debAnswers.includes('Deborah · VSR002'), 'detail shows Deborah · VSR002');
  await page.click('#close-detail');

  // Section 37: Acceptance Test VSR003 (Divine)
  await page.select('#ambassador-filter', 'VSR003');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 2);
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  const divAnswers = await page.$eval('#answers', el => el.textContent);
  assert(divAnswers.includes('Divine · VSR003'), 'detail shows Divine · VSR003');
  await page.click('#close-detail');

  // Section 38: Direct Test
  await page.select('#ambassador-filter', 'Direct');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 2);
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  const directAnswers = await page.$eval('#answers', el => el.textContent);
  assert(directAnswers.includes('Direct'), 'detail shows Direct');
  assert(!directAnswers.includes('null') && !directAnswers.includes('undefined') && !directAnswers.includes('N/A'));
  await page.click('#close-detail');

  // Reset ambassador to All
  await page.select('#ambassador-filter', 'All');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Section 39: Combined filter tests
  // A. Ambassador = Eniola + Status = Registered
  await page.select('#ambassador-filter', 'VSR001');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#filters button')];
    const reg = btns.find(b => b.textContent.trim() === 'Registered');
    if (reg) reg.click();
  });
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.$eval('.lead-row strong', el => el.textContent), 'Eniola Fan 1');

  // Reset status to All
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#filters button')];
    const all = btns.find(b => b.textContent.trim() === 'All');
    if (all) all.click();
  });

  // B. Ambassador = Deborah + Pass = Premium
  await page.select('#ambassador-filter', 'VSR002');
  await page.click(".seg-tab[data-seg='Premium']");
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.$eval('.lead-row strong', el => el.textContent), 'Deborah VIP');

  // Reset pass segment to All
  await page.click(".seg-tab[data-seg='All']");

  // C. Ambassador = Divine + Search = Rachel
  await page.select('#ambassador-filter', 'VSR003');
  await page.type('#search', 'Rachel');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.$eval('.lead-row strong', el => el.textContent), 'Rachel Divine');

  // Clear search and reset ambassador filter
  await page.$eval('#search', el => { el.value = ''; el.dispatchEvent(new Event('input')); });
  await page.select('#ambassador-filter', 'All');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 8);

  // Section 33: Summary pill clicking
  // Click Eniola pill
  await page.evaluate(() => {
    const pills = [...document.querySelectorAll('.ambassador-pill')];
    const eniolaPill = pills.find(p => p.textContent.includes('Eniola'));
    if (eniolaPill) eniolaPill.click();
  });
  assert.equal(await page.$eval('#ambassador-filter', el => el.value), 'VSR001');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 2);

  // Click Eniola pill again to toggle back to All
  await page.evaluate(() => {
    const pills = [...document.querySelectorAll('.ambassador-pill')];
    const eniolaPill = pills.find(p => p.textContent.includes('Eniola'));
    if (eniolaPill) eniolaPill.click();
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

  // Filter on mobile
  await page.select('#ambassador-filter', 'VSR002');
  assert.equal(await page.$$eval('.lead-row', rows => rows.length), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no overflow while filtered');

  // Open lead on mobile
  await page.click('.lead-row');
  await page.waitForSelector('#detail[open]');
  assert.equal(await page.evaluate(() => {
    const d = document.querySelector('#detail');
    return d.scrollWidth > d.clientWidth;
  }), false, 'no mobile drawer overflow');
  await page.screenshot({ path: 'temporary screenshots/clira-detail-mobile.png' });
  await page.click('#close-detail');

  // Reset filter on mobile and screenshot
  await page.select('#ambassador-filter', 'All');
  await page.screenshot({ path: 'temporary screenshots/clira-mobile-ambassadors.png', fullPage: true });

  assert.deepEqual(errors, [], 'no browser runtime console/page errors');
  console.log('PASS ALL ACCEPTANCE TESTS: VSR001, VSR002, VSR003, Direct, combined filters, search, counts, pill toggle, refresh, mobile 390px, screenshots.');
} finally {
  await browser?.close();
  server.kill();
}
