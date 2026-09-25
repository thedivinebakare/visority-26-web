import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {sign}=require('./server/payment.cjs');const coupons=require('./server/coupons.cjs');const {isPremiumCharge}=require('./server/payment.cjs');const verify=require('./api/verify-payment.js');const init=require('./api/initialize-payment.js');const check=require('./api/coupon-check.js');const original=global.fetch;process.env.FUNNEL_SESSION_SECRET='test-only-secret-not-for-production';process.env.PAYSTACK_SECRET_KEY='sk_test_mock';process.env.PUBLIC_SITE_URL='http://localhost:3001';
const FULL=500000,HALF=250000;
async function call(handler,req){let result;const res={setHeader(){},end(x){result={code:this.statusCode,body:JSON.parse(x)};}};await handler(req,res);return result;}
try{
// --- coupon table ---
assert.equal(coupons.FULL_PRICE,FULL);
assert.equal(coupons.resolve('CATERSTUDIOS').amount,HALF);
assert.equal(coupons.resolve('caterstudios').amount,HALF);
assert.equal(coupons.resolve('  Cater Studios  ').amount,HALF);
assert.equal(coupons.resolve('CATER-STUDIOS').amount,HALF);
assert.equal(coupons.resolve('CATERSTUDIOS').code,'CATERSTUDIOS');
assert.equal(coupons.resolve('BOGUS'),null);
assert.equal(coupons.resolve(''),null);
assert.equal(coupons.resolve(undefined),null);
assert.equal(coupons.resolve({}),null);
assert.deepEqual([...coupons.validAmounts()].sort((a,b)=>a-b),[HALF,FULL]);
// --- amount allowlist is the only way a charge is accepted ---
for(const good of [FULL,HALF])assert.equal(isPremiumCharge({status:'success',amount:good,currency:'NGN',domain:'test'}),true,`${good} should be a valid premium charge`);
for(const bad of [1,249999,250001,HALF-100,FULL+1,0,NaN,'500000',null,undefined])assert.equal(isPremiumCharge({status:'success',amount:bad,currency:'NGN',domain:'test'}),false,`${bad} must be rejected`);
assert.equal(coupons.isValidAmount(500000.5),false);
// --- verify: missing session ---
let r=await call(verify,{method:'GET',headers:{}});assert.equal(r.code,401);
// --- verify: legacy order with no amount field still works at full price ---
const legacy={reference:'viso26-legacy',email:'test@example.test',name:'Test Builder',exp:Date.now()+100000};
const legacyCookie='visority_order='+encodeURIComponent(sign(legacy));
const data={status:'success',reference:legacy.reference,amount:FULL,currency:'NGN',customer:{email:legacy.email},domain:'test'};
global.fetch=async()=>({ok:true,json:async()=>({status:true,data})});
r=await call(verify,{method:'GET',headers:{cookie:legacyCookie}});assert.equal(r.body.status,'test');assert.equal(r.body.community,undefined);
// --- verify: legacy order must NOT accept a discounted transaction ---
data.amount=HALF;assert.equal((await call(verify,{method:'GET',headers:{cookie:legacyCookie}})).code,409);
// --- verify: tampered/invalid amounts still rejected ---
data.amount=1;assert.equal((await call(verify,{method:'GET',headers:{cookie:legacyCookie}})).code,409);
data.amount=FULL;data.currency='USD';assert.equal((await call(verify,{method:'GET',headers:{cookie:legacyCookie}})).code,409);
data.currency='NGN';data.customer.email='someone@example.test';assert.equal((await call(verify,{method:'GET',headers:{cookie:legacyCookie}})).code,409);
data.customer.email=legacy.email;
// --- verify: discounted order unlocks on the discounted amount ---
const half={reference:'viso26-half',email:'test@example.test',name:'Test Builder',amount:HALF,coupon:'CATERSTUDIOS',exp:Date.now()+100000};
const halfCookie='visority_order='+encodeURIComponent(sign(half));
const halfData={status:'success',reference:half.reference,amount:HALF,currency:'NGN',customer:{email:half.email},domain:'test'};
global.fetch=async()=>({ok:true,json:async()=>({status:true,data:halfData})});
r=await call(verify,{method:'GET',headers:{cookie:halfCookie}});assert.equal(r.body.status,'test');
// --- verify: price swap between order and provider is refused ---
halfData.amount=FULL;assert.equal((await call(verify,{method:'GET',headers:{cookie:halfCookie}})).code,409);
halfData.amount=HALF+1;assert.equal((await call(verify,{method:'GET',headers:{cookie:halfCookie}})).code,409);
halfData.amount=HALF;
// --- verify: a forged cookie signature yields no order at all ---
const forged='visority_order='+encodeURIComponent(sign(half).split('.')[0]+'.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
assert.equal((await call(verify,{method:'GET',headers:{cookie:forged}})).code,401);
// --- cross-origin initialization refused ---
assert.equal((await call(init,{method:'POST',headers:{origin:'https://wrong.test'},body:{}})).code,403);
// --- invalid code is rejected BEFORE any provider call ---
let called=false;global.fetch=async()=>{called=true;throw Error('must not reach Paystack');};
assert.equal((await call(init,{method:'POST',headers:{},body:{name:'Ada Lovelace',email:'ada@example.test',coupon:'NOT-A-CODE'}})).code,400);
assert.equal(called,false,'an invalid code must never initialize a payment');
// --- empty / absent code is not an error, just no discount ---
r=await call(check,{method:'POST',headers:{},body:{code:'   '}});assert.equal(r.code,400);
r=await call(check,{method:'POST',headers:{},body:{}});assert.equal(r.code,400);
r=await call(check,{method:'POST',headers:{},body:{code:'x'.repeat(200)}});assert.equal(r.code,400);
// --- valid code reports the discounted amount without touching Paystack ---
called=false;r=await call(check,{method:'POST',headers:{},body:{code:'caterstudios'}});
assert.equal(r.code,200);assert.equal(r.body.valid,true);assert.equal(r.body.amount,HALF);assert.equal(r.body.original,FULL);assert.equal(r.body.display,'₦2,500');assert.equal(r.body.originalDisplay,'₦5,000');assert.equal(r.body.percent,50);assert.equal(called,false);
assert.equal((await call(check,{method:'GET',headers:{},body:{}})).code,405);
assert.equal((await call(check,{method:'POST',headers:{origin:'https://wrong.test'},body:{code:'CATERSTUDIOS'}})).code,403);
console.log('PASS coupon table, amount allowlist, legacy orders, discounted verify, price-swap rejection, forged cookie, invalid-code short circuit and cross-origin guards.');}finally{global.fetch=original;}
