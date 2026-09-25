const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),{parseEnv}=require('node:util');
const base='https://www.visoritylive.com';
async function request(path,options={}){return fetch(base+path,{...options,signal:AbortSignal.timeout(20000)});}
(async()=>{
const config=await(await request('/api/payment-config')).json();assert.equal(config.testMode,false);assert.equal(config.onlineReady,true);assert.equal(config.manualReady,true);assert.equal(config.bank.holder,'Victor Maji');console.log('PASS live payment config and manual account.');
for(const path of ['/checkout/vip/','/vip/thank-you/','/access/recover/']){const r=await request(path);assert.equal(r.status,200);console.log('PASS '+path);}
const webhook=await request('/api/paystack-webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(webhook.status,401);console.log('PASS webhook rejects unsigned requests.');
const secret=parseEnv(fs.readFileSync('.env','utf8')).PAYSTACK_SECRET_KEY;
const payload='{ "event": "deployment.check", "data": {} }';
const signed=await request('/api/paystack-webhook',{method:'POST',headers:{'Content-Type':'application/json','x-paystack-signature':crypto.createHmac('sha512',secret).update(payload).digest('hex')},body:payload});assert.equal(signed.status,200);console.log('PASS webhook accepts exact signed bytes (non-payment probe, no records created).');
const access=await request('/api/verify-payment');assert.equal(access.status,401);console.log('PASS Premium access requires verification.');
const forbidden=await request('/api/initialize-payment',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(forbidden.status,403);console.log('PASS checkout rejects unrelated origins.');
const env=await request('/.env');assert.equal(env.status,404);console.log('PASS private environment is not published.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
