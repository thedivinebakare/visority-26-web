const coupons=require('../server/coupons.cjs');
const {json,body,originAllowed}=require('../server/payment.cjs');
// Pure lookup: validates a sponsor code and reports the amount it unlocks.
// Never contacts Paystack and never changes an order, so it is safe to call
// on every keystroke of the "apply" action.
module.exports=async(req,res)=>{if(req.method!=='POST')return json(res,405,{message:'Use POST.'});if(!originAllowed(req))return json(res,403,{message:'Invalid origin.'});let input;
try{input=await body(req);}catch{return json(res,400,{valid:false,message:'Please check the discount code.'});}
const raw=input.code;if(typeof raw!=='string'||raw.length>60)return json(res,400,{valid:false,message:'That discount code is not valid. Check it and try again, or continue at the full price.'});
const applied=coupons.resolve(raw);
if(!applied)return json(res,400,{valid:false,message:'That discount code is not valid. Check it and try again, or continue at the full price.'});
json(res,200,{valid:true,code:applied.code,label:applied.label,percent:applied.percent,amount:applied.amount,original:applied.original,display:coupons.naira(applied.amount),originalDisplay:coupons.naira(applied.original),message:`${applied.label} — ${applied.percent}% off applied.`});};
