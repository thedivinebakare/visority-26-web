const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
process.env.PAYSTACK_SECRET_KEY='sk_live_mock';
process.env.FUNNEL_SESSION_SECRET='local-test-session-secret-with-32-characters';
process.env.PUBLIC_SITE_URL='https://www.visoritylive.com';
const payment=require('./server/payment.cjs');
const webhook=require('./server/paystack-webhook.cjs');
const recover=require('./api/recover-access.js');
const initialize=require('./api/initialize-payment.js');
const transaction={status:'success',amount:500000,currency:'NGN',domain:'live',reference:'viso26-12345678-abcdef',customer:{email:'qa@example.invalid'},metadata:{event:'visority26',fullName:'QA User'}};
async function call(handler,req){const headers={};let output;await handler(req,{setHeader(k,v){headers[k]=v;},end(v){output={status:this.statusCode,data:JSON.parse(v),headers};}});return output;}
async function event(data=transaction,signature){const body=Buffer.from(JSON.stringify({event:'charge.success',data}));return call(webhook,{method:'POST',headers:{'x-paystack-signature':signature??crypto.createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex')},body});}
(async()=>{
assert(payment.onlineReady());assert(payment.originAllowed({headers:{origin:'https://visoritylive.com'}}));assert(!payment.originAllowed({headers:{origin:'https://evil.example'}}));
assert.match(fs.readFileSync('dist/access/recover/index.html','utf8'),/id="recover-reference" required/);
let saves=0,saveOK=false;global.fetch=async url=>String(url).startsWith('https://api.paystack.co')?{ok:true,json:async()=>({status:true,data:transaction})}:{ok:true,text:async()=>{saves++;return JSON.stringify({result:saveOK?'success':'error'});}};
assert.equal((await event(transaction,'0'.repeat(128))).status,401);
assert.equal((await event({...transaction,amount:1})).data.ignored,true);
assert.equal((await event({...transaction,domain:'test'})).data.ignored,true);
assert.equal((await event()).status,503);saveOK=true;assert.equal((await event()).status,200);assert.equal(saves,2);
assert.equal((await call(recover,{method:'POST',headers:{},body:{email:transaction.customer.email}})).status,400);
let result=await call(recover,{method:'POST',headers:{},body:{email:transaction.customer.email,reference:transaction.reference}});assert.equal(result.data.status,'verified');assert.match(result.headers['Set-Cookie'],/HttpOnly.*Domain=visoritylive.com; Secure/);
let initialized;global.fetch=async(url,options)=>{initialized=JSON.parse(options.body);return {ok:true,json:async()=>({status:true,data:{authorization_url:'https://checkout.paystack.com/qa'}})};};
result=await call(initialize,{method:'POST',headers:{origin:'https://visoritylive.com'},body:{name:'QA User',email:'qa@example.invalid'}});assert.equal(result.status,200);assert.equal(initialized.callback_url,'https://www.visoritylive.com/vip/thank-you/');assert.equal(initialized.amount,500000);assert.equal(initialized.metadata.couponCode,'');assert.match(result.headers['Set-Cookie'],/Secure/);
// CATERSTUDIOS must initialise at the discounted amount and record the code for the audit trail.
result=await call(initialize,{method:'POST',headers:{origin:'https://visoritylive.com'},body:{name:'QA User',email:'qa@example.invalid',coupon:'caterstudios'}});assert.equal(result.status,200);assert.equal(initialized.amount,250000);assert.equal(initialized.metadata.couponCode,'CATERSTUDIOS');assert.equal(initialized.metadata.amountPaid,250000);assert.equal(result.data.display,'₦2,500');
result=await call(initialize,{method:'POST',headers:{origin:'https://visoritylive.com'},body:{name:'QA User',email:'qa@example.invalid',coupon:'NOPE'}});assert.equal(result.status,400);
// A discounted charge must fulfil through the webhook just like a full-price one.
const half={...transaction,reference:'viso26-87654321-halfdisc',amount:250000,metadata:{event:'visority26',fullName:'QA User',couponCode:'CATERSTUDIOS'}};
saves=0;global.fetch=async url=>String(url).startsWith('https://api.paystack.co')?{ok:true,json:async()=>({status:true,data:half})}:{ok:true,text:async()=>{saves++;return JSON.stringify({result:'success'});}};
assert.equal((await event(half)).status,200);assert.equal(saves,1);
assert.equal((await event({...half,amount:250001})).data.ignored,true);
// Recovery must find and re-issue a discounted payment, carrying the amount into the new cookie.
let result2=await call(recover,{method:'POST',headers:{},body:{email:half.customer.email,reference:half.reference}});assert.equal(result2.data.status,'verified');
const cookie=decodeURIComponent(/visority_order=([^;]+)/.exec(result2.headers['Set-Cookie'])[1]);
const order=JSON.parse(Buffer.from(cookie.split('.')[0],'base64url').toString());
assert.equal(order.amount,250000);assert.equal(order.coupon,'CATERSTUDIOS');
console.log('PASS live config, origins, canonical callback, secure cookie, webhook signature/amount/domain, failed-save retry, recovery reference requirement, CATERSTUDIOS discount initialisation, discounted webhook fulfilment and discounted recovery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
