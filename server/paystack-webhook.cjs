const referrals=require('./referrals.cjs');
const coupons=require('./coupons.cjs');
const {json,verifyPaystackSignature,rawBody,isPremiumCharge,paystack}=require('./payment.cjs');
const {log}=require('./sheets.cjs');
module.exports=async(req,res)=>{if(req.method!=='POST')return json(res,405,{message:'Use POST.'});let body;
try{body=await rawBody(req);}catch{return json(res,400,{message:'Invalid payload.'});}if(!verifyPaystackSignature(body,req.headers['x-paystack-signature']))return json(res,401,{message:'Invalid signature.'});let event;
try{event=JSON.parse(body.toString('utf8'));}catch{return json(res,400,{message:'Invalid JSON.'});}const data=event&&event.data;if(event?.event!=='charge.success')return json(res,200,{received:true});if(!isPremiumCharge(data)||!/^viso26-[a-z0-9-]+$/i.test(data.reference||'')||data.metadata?.event!=='visority26'||typeof data.customer?.email!=='string')return json(res,200,{received:true,ignored:true});const reference=data.reference;
try{
const verified=await paystack('/transaction/verify/'+encodeURIComponent(reference));
if(!isPremiumCharge(verified)||verified.reference!==reference||verified.metadata?.event!=='visority26'||verified.customer?.email?.toLowerCase()!==data.customer.email.toLowerCase())return json(res,409,{message:'Payment details do not match.'});
const name=typeof verified.metadata?.fullName==='string'?verified.metadata.fullName.slice(0,120):'';
const code=typeof verified.metadata?.couponCode==='string'?verified.metadata.couponCode.slice(0,40):'';
const note=`Paystack charge.success · ${reference} · ${verified.domain} · ${coupons.naira(verified.amount)}`+(code?` · code ${code}`:'');
// At-least-once audit delivery; reconcile duplicates by reference. Paystack remains the payment source of truth.
const saved=await log('payment-confirmed',{fullName:name,email:verified.customer.email,role:'PREMIUM / VERIFIED',customNote:note,selectedTier:'vip'});
if(!saved)return json(res,503,{message:'Payment notification will be retried.'});
if(verified.metadata?.referralCode)await referrals.record('premium',{code:verified.metadata.referralCode,email:verified.customer.email,reference,domain:verified.domain});
return json(res,200,{received:true});
}catch{return json(res,503,{message:'Payment notification will be retried.'});}};
module.exports.config={api:{bodyParser:false}};
