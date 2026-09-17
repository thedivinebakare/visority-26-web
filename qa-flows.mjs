import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base='http://localhost:3000';
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const assetErrors=[];page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)assetErrors.push(`${r.status()} ${r.url()}`);});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
  await mkdir('temporary screenshots',{recursive:true});
  for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844],['small',360,800],['tablet',768,1024]]){
    await page.setViewport({width,height});await page.goto(base,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:`temporary screenshots/upgrade-${label}-hero.png`});
    await page.evaluate(async()=>{document.documentElement.style.scrollBehavior='auto';for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,70));}await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));scrollTo(0,0);});await pause(800);
    const problems=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));assert.ok(problems.overflow<=1,`${label}: horizontal overflow ${problems.overflow}`);assert.deepEqual(problems.broken,[],`${label}: images`);
    if(label==='desktop'||label==='mobile')await page.screenshot({path:`temporary screenshots/upgrade-${label}-full.png`,fullPage:true});
    console.log(`PASS ${label} homepage: no overflow or broken images`);
  }
  for(const route of ['/register/?pass=standard','/register/?pass=premium','/partners/','/ambassadors/','/checkout/vip/','/access/standard-confirmation/','/vip/thank-you/?reference=FAKE']){
    await page.setViewport({width:390,height:844});await page.goto(base+route,{waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,`${route}: mobile overflow`);console.log(`PASS ${route}`);
  }
  await page.goto(base+'/vip/thank-you/?reference=FAKE');assert.ok((await page.$eval('main',e=>e.textContent)).includes('Payment isn’t verified'));assert.equal(await page.evaluate(()=>localStorage.getItem('visority_vip_verified')),null);
  await page.goto(base);await page.click('.menu-toggle');assert.equal(await page.$eval('.menu-toggle',e=>e.getAttribute('aria-expanded')),'true');await page.keyboard.press('Escape');assert.equal(await page.$eval('.menu-toggle',e=>e.getAttribute('aria-expanded')),'false');
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.goto(base);assert.equal(await page.$eval('.marquee-track',e=>getComputedStyle(e).animationName),'none');assert.equal(await page.$eval('[data-reveal]',e=>getComputedStyle(e).opacity),'1');await page.emulateMediaFeatures([]);
  const posts=[];let fail=false;await page.setRequestInterception(true);page.on('request',req=>{if(req.url().includes('script.google.com')){posts.push({url:req.url(),body:req.postData()});if(fail)req.abort('failed');else req.respond({status:200,contentType:'application/json',body:'{"result":"success"}'});}else req.continue();});
  async function complete(pass){
    await page.goto(base+`/register/?pass=${pass}&ref=test-ref`);await page.click('#reg-next');assert.equal(await page.$eval('#form-error',e=>e.hidden),false);
    await page.type('#f-name','Test Builder');await page.type('#f-email','builder@example.test');await page.click('#reg-next');await page.click('[data-choice="f-role"] .choice');await pause(400);
    await page.type('#f-phone','+234 801 234 5678');await page.keyboard.press('Enter');await page.click('[data-choice="f-challenge"] .choice');await pause(400);await page.click('[data-choice="f-expect"] .choice');await pause(400);
    assert.equal(await page.$eval('#reg-step-label',e=>e.textContent),'06 — 06');await page.click('#reg-back');assert.equal(await page.$eval('#f-expect',e=>e.value),'Authority and positioning frameworks');await page.click('#reg-next');
    await page.type('#f-note','First line');await page.keyboard.press('Enter');await page.type('#f-note','Second line');assert.equal(await page.$eval('#f-note',e=>e.value),'First line\nSecond line');
    const before=posts.length;await page.click('#reg-submit');await pause(500);assert.equal(posts.length,before+1,'One POST per submission');return new URLSearchParams(posts.at(-1).body);
  }
  let payload=await complete('premium');assert.equal(payload.get('selectedTier'),'vip');assert.equal(await page.$eval('#registration-next',e=>e.getAttribute('href')),'/checkout/vip/');assert.equal(await page.$eval('#registration-result',e=>e.hidden),false);
  payload=await complete('standard');assert.equal(payload.get('selectedTier'),'standard');assert.equal(await page.$eval('#registration-next',e=>e.getAttribute('href')),'/access/standard-confirmation/');
  fail=true;await complete('standard');assert.equal(await page.$eval('#form-error',e=>e.hidden),false);assert.equal(await page.$eval('#f-name',e=>e.value),'Test Builder');fail=false;
  await page.goto(base+'/partners/');await page.type('#partner-org','Test Organisation');await page.select('#partner-type','Resource Partner');await page.type('#partner-contact','partner@example.test');await page.click('#partner-form button[type=submit]');await pause(500);assert.ok(posts.at(-1).url.includes('AKfycbwPw'));assert.equal(new URLSearchParams(posts.at(-1).body).get('partnershipType'),'Resource Partner');
  await page.goto(base+'/?tier=vip#register');await page.waitForFunction(()=>location.pathname==='/register/');assert.ok(page.url().includes('pass=premium'));
  assert.deepEqual(errors,[]);assert.deepEqual(assetErrors,[]);console.log('PASS forms, validation, back/Enter navigation, single submission, retry, partner routing, legacy links, reduced motion and payment state. No real leads or payments created.');
}finally{await browser.close();}
