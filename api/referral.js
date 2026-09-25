const {json,body,originAllowed}=require('../server/payment.cjs');
const {capture}=require('../server/referrals.cjs');
module.exports=async(req,res)=>{if(req.method!=='POST')return json(res,405,{message:'Use POST.'});if(!originAllowed(req))return json(res,403,{message:'Invalid origin.'});try{const input=await body(req);return json(res,200,await capture(req,res,input.code));}catch{return json(res,503,{captured:false});}};
