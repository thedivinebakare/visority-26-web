import assert from 'node:assert/strict';
const base='https://visority-26-web.vercel.app';
const checks=[['/','IT’S YOUR TIME TO BE SEEN.'],['/register/?pass=premium','reg-step-label'],['/partners/','partner-form'],['/ambassadors/','ref-link-input'],['/checkout/vip/','Payment is not open here yet.'],['/access/standard-confirmation/','calendar-download'],['/vip/thank-you/?reference=FAKE','Payment isn’t verified here.'],['/assets/css/visority.css','--orange:#f4480c'],['/assets/js/registration.js','registration-result']];
await Promise.all(checks.map(async([path,expected])=>{const response=await fetch(base+path);assert.equal(response.status,200,path);assert.ok((await response.text()).includes(expected),`Current build content missing: ${path}`);console.log('PASS '+path);}));
for(const path of ['/assets/images/mandy_chinedum-480.webp','/fonts/font-0.woff2']){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>100);console.log('PASS '+path);}
for(const path of ['/docs/BUILD-NOTES.md','/scripts/build-pages.mjs','/backups/RESTORE.md']){const r=await fetch(base+path);assert.equal(r.status,404,`Internal file exposed: ${path}`);console.log('PASS private source excluded '+path);}
console.log('Live deployment smoke checks passed. No forms submitted.');
