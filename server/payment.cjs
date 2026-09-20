const crypto=require('node:crypto');
const secret=()=>process.env.FUNNEL_SESSION_SECRET;
function sign(data){const p=Buffer.from(JSON.stringify(data)).toString('base64url');return p+'.'+crypto.createHmac('sha256',secret()).update(p).digest('base64url');}
function read(req){try{const c=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('visority_order='));const [p,s]=decodeURIComponent(c.slice(15)).split('.');const expected=crypto.createHmac('sha256',secret()).update(p).digest('base64url');if(s.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;const d=JSON.parse(Buffer.from(p,'base64url'));return d.exp>Date.now()?d:null;}catch{return null;}}
function json(res,status,data){res.setHeader('Cache-Control','no-store');res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
async function body(req){if(req.body)return typeof req.body==='string'?JSON.parse(req.body):req.body;let text='';for await(const chunk of req){text+=chunk;if(text.length>10000)throw Error('Too large');}return JSON.parse(text||'{}');}
async function paystack(path,options={}){const r=await fetch('https://api.paystack.co'+path,{...options,headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok||!data.status)throw Error('Payment provider unavailable');return data.data;}
module.exports={sign,read,json,body,paystack};
