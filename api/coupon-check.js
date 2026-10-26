const coupons=require('../server/coupons.cjs');
const couponLedger=require('../server/coupon-ledger-client.cjs');
const {json,body,originAllowed}=require('../server/payment.cjs');

module.exports=async(req,res)=>{
  if(req.method!=='POST')return json(res,405,{message:'Use POST.'});
  if(!originAllowed(req))return json(res,403,{message:'Invalid origin.'});
  let input;
  try{input=await body(req);}catch{return json(res,400,{valid:false,message:'Please check the discount code.'});}
  const raw=input.code;
  if(typeof raw!=='string'||raw.length>60)return json(res,400,{valid:false,message:'That discount code is not valid. Check it and try again, or continue at the full price.'});
  const applied=coupons.resolve(raw);
  if(!applied)return json(res,400,{valid:false,message:'That discount code is not valid. Check it and try again, or continue at the full price.'});

  if(applied.code==='CATERSTUDIOS'){
    const state=await couponLedger.status('CATERSTUDIOS');
    if(!state.ok){
      return json(res,503,{valid:false,message:"We couldn't verify this coupon right now. Please try again."});
    }
    if(state.used>=state.maximum){
      return json(res,400,{valid:false,code:'COUPON_EXHAUSTED',message:'All available uses of this coupon have been claimed.'});
    }
    if(state.available<=0){
      return json(res,400,{valid:false,code:'COUPON_BUSY',message:'All slots for this discount are currently reserved in active checkouts. Please try again shortly.'});
    }
  }

  json(res,200,{
    valid:true,
    code:applied.code,
    label:applied.label,
    percent:applied.percent,
    amount:applied.amount,
    original:applied.original,
    display:coupons.naira(applied.amount),
    originalDisplay:coupons.naira(applied.original),
    message:`${applied.label} — ${applied.percent}% off applied.`
  });
};
