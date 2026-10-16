const assert=require('node:assert/strict');
const base='https://www.visoritylive.com';
async function get(path,options={}){const response=await fetch(base+path,{...options,signal:AbortSignal.timeout(20000)});return response;}
(async()=>{
const css=await(await get('/assets/css/funnel.css')).text();assert(css.includes('-webkit-text-fill-color:#171717'));console.log('PASS live coupon text contrast fix.');
for(const path of ['/','/skill-fund/','/checkout/vip/','/assets/js/skill-fund.js','/assets/js/funnel.js']){
const response=await get(path);assert.equal(response.status,200);const text=await response.text();assert(!/caterstudios/i.test(text),'Public coupon disclosure: '+path);
if(path==='/')assert.match(text,/Explore the Skill Fund/);
if(path==='/skill-fund/')assert.match(text,/Great talent/);
console.log('PASS '+path+' and private-code visibility.');
}
const response=await get('/api/coupon-check',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({code:'caterstudios'})});assert.equal(response.status,200);const coupon=await response.json();assert.equal(coupon.amount,250000);assert.equal(coupon.valid,true);console.log('PASS live coupon gives NGN 2,500.');
const config=await(await get('/api/payment-config')).json();assert.equal(config.onlineReady,true);assert.equal(config.testMode,false);console.log('PASS live payments remain enabled.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
