import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp} from 'node:fs/promises';
const server=spawn(process.execPath,['serve.mjs'],{env:{...process.env,PORT:'3012'},stdio:'ignore',windowsHide:true});
const base='http://localhost:'+(process.env.PORT||3001);let browser;
try{
for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
await mkdir('temporary screenshots',{recursive:true});
const profile=await mkdtemp('temporary screenshots/ambassador-browser-');
browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',userDataDir:profile,headless:true,args:['--no-sandbox','--no-first-run']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('temporary screenshots',{recursive:true});
for(const [label,width,height]of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844],['small',360,800]]){
await page.setViewport({width,height});await page.goto(base+'/ambassadors/',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');
assert.equal(await page.$$eval('.amb-perk',a=>a.length),4);
assert.equal(await page.$eval('#ref-link-input',e=>e.value),'https://www.visoritylive.com/?ref=ambassador');
const links=await page.$$eval('[data-track="ambassador_whatsapp_click"]',a=>a.map(x=>x.href));assert.equal(links.length,2);assert(links.every(x=>new URL(x).pathname==='/2349037889885'));
if(['desktop','mobile'].includes(label))await page.screenshot({path:'temporary screenshots/ambassador-upgrade-'+label+'.png',fullPage:true});
console.log('PASS '+label+' layout, onboarding and canonical sharing');}
await page.evaluate(()=>{window.__events=[];window.addEventListener('visority:analytics',e=>window.__events.push(e.detail.event));Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});});
await page.focus('#copy-ref');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__copied),'https://www.visoritylive.com/?ref=ambassador');assert.deepEqual(await page.evaluate(()=>window.__events),['ambassador_copy']);
await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked');}}});});await page.click('#copy-ref');assert.match(await page.$eval('#ref-feedback',e=>e.textContent),/Select and copy/);
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await page.$eval('.amb-seal-ring',e=>getComputedStyle(e).animationName),'none');
await page.goto(base+'/?ref=sample#ambassador-program',{waitUntil:'networkidle0'});assert.equal(new URL(page.url()).pathname,'/ambassadors/');assert.equal(new URL(page.url()).searchParams.get('ref'),'sample');assert.deepEqual(errors,[]);
console.log('PASS keyboard copy, analytics, denied-clipboard fallback, reduced motion and legacy routing.');
}finally{await browser?.close();server.kill();}
