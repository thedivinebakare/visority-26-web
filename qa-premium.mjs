import puppeteer from 'puppeteer-core';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await mkdir('temporary screenshots',{recursive:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const port=process.env.PORT||3001;
 for(const [name,width,height] of [['desktop',1440,1000],['laptop',1280,800],['mobile',390,844],['small',360,800],['tablet',768,1024]]){
  await page.setViewport({width,height});await page.goto(`http://localhost:${port}`,{waitUntil:'networkidle0'});await page.evaluate(async()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,`${name} overflow`);
  assert.equal(await page.$eval('.wordmark img',e=>e.complete&&e.naturalWidth>0),true);
  assert.equal(await page.$('.hero-portrait'),null);
  assert.equal(await page.$('.speaker-word'),null);
  assert.equal(await page.$eval('.special-appearance',e=>e.textContent.includes('SPECIAL APPEARANCE')),true);
  assert.equal(await page.$eval('#ambassador-program .button',e=>e.getAttribute('href')),'/ambassadors/');
  assert.equal(await page.$eval('h1',e=>e.scrollWidth>e.clientWidth),false,`${name} headline clipped`);
  await page.screenshot({path:`temporary screenshots/premium-${name}-hero.png`});
  for(const [label,selector] of [['ambassadors','#ambassador-program'],['skill-fund','#skill-fund'],['special-guest','.speaker-ikenna'],['speaker','.speaker-mandy'],['pricing','#pricing'],['schedule','#schedule'],['chapter','.chapter'],['problem','#experience']]){
   await page.$eval(selector,e=>e.scrollIntoView());await delay(650);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,`${name} ${label} overflow`);
   if(name==='desktop'||name==='mobile')await page.screenshot({path:`temporary screenshots/premium-${name}-${label}.png`});
  }
  await page.$eval('[data-open-dialog="bio-divine"]',e=>e.scrollIntoView({block:'center'}));await page.click('[data-open-dialog="bio-divine"]');assert.equal(await page.$eval('#bio-divine',e=>e.open),true);
  if(name==='desktop'||name==='mobile')await page.screenshot({path:`temporary screenshots/premium-${name}-dialog.png`});
  await page.keyboard.press('Escape');assert.equal(await page.$eval('#bio-divine',e=>e.open),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.openDialog),'bio-divine');
  await page.$eval('.pass-comparison',e=>e.scrollIntoView());await page.click('.pass-comparison summary');assert.equal(await page.$eval('.pass-comparison',e=>e.open),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,`${name} comparison overflow`);
  await page.$eval('.session:nth-child(2) summary',e=>e.scrollIntoView({block:'center'}));await delay(250);await page.click('.session:nth-child(2) summary');assert.equal(await page.$eval('.session:nth-child(2)',e=>e.open),true);
  assert.ok(await page.$eval('.session:nth-child(2) .calendar-button',e=>e.getAttribute('data-calendar-day')==='02'));
  console.log(`PASS ${name}: layout, dialogs, comparison and session details`);
 }
 await page.setViewport({width:1440,height:1000});await page.goto(`http://localhost:${port}`);await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');await page.$eval('#experience',e=>e.scrollIntoView());await delay(250);assert.equal(await page.$eval('.ticket-dock',e=>e.hidden),false);await page.$eval('#pricing',e=>e.scrollIntoView());await delay(250);assert.equal(await page.$eval('.ticket-dock',e=>e.hidden),true);
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.goto(`http://localhost:${port}`);assert.equal(await page.$eval('.marquee-track',e=>getComputedStyle(e).animationName),'none');assert.equal(await page.$eval('[data-reveal]',e=>getComputedStyle(e).opacity),'1');
 await page.setJavaScriptEnabled(false);await page.goto(`http://localhost:${port}`);assert.equal(await page.$eval('[data-reveal]',e=>getComputedStyle(e).opacity),'1');await page.setJavaScriptEnabled(true);
 await page.goto(`http://localhost:${port}`);await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';const original=URL.createObjectURL;URL.createObjectURL=function(blob){window.calendarContent=blob.text();return original.call(this,blob);};});
 const session=await page.createCDPSession();await session.send('Browser.setDownloadBehavior',{behavior:'deny'});
 await page.$eval('.session:nth-child(2) summary',e=>e.scrollIntoView({block:'center'}));await delay(250);await page.click('.session:nth-child(2) summary');await page.click('[data-calendar-day="02"]');
 const calendar=await page.evaluate(()=>window.calendarContent);assert.ok(calendar.includes('DTSTART:20261029T190000Z'));assert.ok(calendar.includes('DTEND:20261029T210000Z'));assert.ok(calendar.includes('The Business Side of Being a Freelancer'));
 assert.deepEqual(errors,[]);console.log('PASS dock visibility, reduced motion, no-JavaScript content, calendar data and no runtime errors.');
}finally{await browser.close();}
