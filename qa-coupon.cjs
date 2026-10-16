const assert=require('node:assert/strict'),fs=require('node:fs');
process.env.PAYSTACK_SECRET_KEY='sk_live_mock';process.env.FUNNEL_SESSION_SECRET='mock-secret-with-at-least-thirty-two-characters';process.env.PUBLIC_SITE_URL='https://www.visoritylive.com';
const init=require('./api/initialize-payment.js'),verify=require('./api/verify-payment.js'),coupons=require('./server/coupons.cjs'),{sign,isPremiumCharge}=require('./server/payment.cjs');
async function call(handler,req){let result;const headers={};await handler(req,{setHeader(k,v){headers[k]=v;},end(s){result={status:this.statusCode,data:JSON.parse(s),headers};}});return result;}
(async()=>{
assert.equal(coupons.resolve('caterstudios').amount,250000);assert.equal(coupons.resolve('wrong'),null);
let sent;global.fetch=async(url,options)=>String(url).includes('/verify/')?{ok:true,json:async()=>({status:true,data:{status:'pending'}})}:{ok:true,json:async()=>{sent=JSON.parse(options.body);return {status:true,data:{authorization_url:'https://checkout.paystack.com/mock'}};}};
const old={reference:'viso26-old',name:'QA User',email:'qa@example.invalid',url:'https://checkout.paystack.com/old',amount:500000,coupon:'',exp:Date.now()+100000};
let r=await call(init,{method:'POST',headers:{cookie:'visority_order='+encodeURIComponent(sign(old))},body:{name:old.name,email:old.email,coupon:'caterstudios',amount:1}});assert.equal(r.status,200);assert.equal(sent.amount,250000);assert.notEqual(r.data.url,old.url);assert.equal(sent.metadata.couponCode,'CATERSTUDIOS');
r=await call(init,{method:'POST',headers:{},body:{name:old.name,email:old.email,coupon:'invalid'}});assert.equal(r.status,400);
const charge={status:'success',reference:'viso26-new',amount:250000,currency:'NGN',domain:'live',customer:{email:old.email},metadata:{event:'visority26',couponCode:'CATERSTUDIOS'}};
assert(isPremiumCharge(charge));assert(!isPremiumCharge({...charge,metadata:{event:'visority26'}}));assert(!isPremiumCharge({...charge,amount:1}));
global.fetch=async()=>({ok:true,json:async()=>({status:true,data:charge})});
r=await call(verify,{method:'GET',headers:{cookie:'visority_order='+encodeURIComponent(sign({...old,reference:charge.reference,amount:250000,coupon:'CATERSTUDIOS'}))}});assert.equal(r.data.status,'verified');
for(const path of ['dist/index.html','dist/skill-fund/index.html','dist/checkout/vip/index.html','dist/assets/js/skill-fund.js','dist/assets/js/funnel.js'])assert(!/caterstudios/i.test(fs.readFileSync(path,'utf8')),path+' exposes private code');
console.log('PASS 50% server price, stale-link replacement, invalid coupon rejection, tampered amount rejection, verified discounted access and public-code privacy.');
})().catch(e=>{console.error(e);process.exitCode=1;});
