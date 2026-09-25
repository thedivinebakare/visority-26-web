import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base='http://localhost:3001';
const page=await browser.newPage();
const errors=[];const assetErrors=[];const tracked=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)assetErrors.push(`${r.status()} ${r.url()}`);});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const WA='wa.me/2349037889885';
const MSG='Hello%20Vee%20Maji%2C%20I%27m%20ready%20to%20become%20the%20face%20of%20Visority%20%2726%20as%20an%20Ambassador.%20Please%20set%20me%20up%20with%20my%20referral%20link%21';
try{
  for(const [name,width,height] of [['desktop',1440,1000],['laptop',1280,800],['tablet',768,1024],['mobile',390,844],['small',360,800]]){
    await page.setViewport({width,height});
    await page.goto(base+'/ambassadors/',{waitUntil:'networkidle0'});
    await page.evaluate(async()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,`${name} overflow`);
    assert.equal(await page.$eval('link[rel=canonical]',e=>e.getAttribute('href')),'https://www.visoritylive.com/ambassadors/',`${name} canonical`);
    assert.equal(await page.$eval('.ambassador-seal',e=>e.textContent.replace(/\s+/g,' ').trim()),"VISORITY ’26AAMBASSADOR",`${name} seal`);
    assert.equal(await page.$$eval('.perk-card',els=>els.length),4,`${name} perk cards`);
    const perks=await page.$$eval('.perk-card',els=>els.map(e=>e.textContent.replace(/\s+/g,' ').trim()));
    assert.ok(perks.some(t=>t.includes('01')&&t.includes('Free Full Access Pass'))&&perks.some(t=>t.includes('Social Media Shout-Out'))&&perks.some(t=>t.includes('Exclusive Community Access'))&&perks.some(t=>t.includes('Custom Referral Tracking')),`${name} perk content`);
    const ref=await page.$eval('#ref-link-input',e=>e.value);
    assert.equal(ref,base+'/?ref=ambassador',`${name} share link`);
    if(name==='mobile'||name==='small')assert.equal(await page.$eval('.ref-row',e=>getComputedStyle(e).flexDirection),'column',`${name} stacked share tool`);
    console.log(`PASS ${name}: layout, canonical, seal, perks, share tool`);
  }
  await page.setViewport({width:390,height:844});
  await page.goto(base+'/ambassadors/',{waitUntil:'networkidle0'});
  await page.evaluate(()=>window.addEventListener('visority:analytics',e=>window.__track&&window.__track(e.detail.event)));
await page.exposeFunction('__track',e=>tracked.push(e));
  const waLinks=await page.$$eval('.ambassador-whatsapp-card a,.ambassador-hero-actions a',els=>els.filter(e=>e.getAttribute('target')==='_blank').map(e=>e.getAttribute('href')));
  assert.equal(waLinks.length,2,'two WhatsApp CTAs');
  for(const href of waLinks){assert.ok(href.startsWith('https://'+WA),'wa number: '+href);assert.ok(href.includes(MSG),'encoded message: '+href);}
  await page.$$eval('.ambassador-hero-actions a,.ambassador-whatsapp-card a',els=>els.forEach(a=>{a.removeAttribute('target');a.removeAttribute('href');}));
  await page.click('.ambassador-hero-actions a');
  assert.ok(tracked.includes('ambassador_whatsapp_click'),'hero CTA tracked');
  await page.click('.ambassador-whatsapp-card a');
  assert.ok(tracked.filter(e=>e==='ambassador_whatsapp_click').length>=2,'card CTA tracked');
  const client=await page.createCDPSession();
  await client.send('Browser.grantPermissions',{permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  await page.click('#copy-ref');
  await pause(300);
  assert.equal(await page.$eval('#ref-feedback',e=>e.textContent),'Link copied. Share it with your people.');
  assert.equal(await page.$eval('#copy-ref',e=>e.textContent.includes('COPIED')),true);
  assert.equal(await page.$eval('#copy-ref',e=>e.classList.contains('is-copied')),true);
  assert.ok(tracked.includes('ambassador_copy'),'copy tracked');
  await pause(2400);
  assert.equal(await page.$eval('#copy-ref',e=>e.textContent.includes('COPY LINK')),true,'button resets');
  assert.equal(await page.$eval('#ref-feedback',e=>e.textContent),'',`feedback clears: "${await page.$eval('#ref-feedback',e=>e.textContent)}"`);
  await client.send('Browser.resetPermissions');
  assert.deepEqual(errors,[]);assert.deepEqual(assetErrors,[]);
  console.log('PASS WhatsApp links, encoding, analytics events, copy feedback, reset.');
}finally{await browser.close();}