// Sponsor and partner discount codes. The server is the only authority on the
// charged amount: clients send a code string, never a price.
const FULL_PRICE=500000;
// Unlimited redemption by design. A sponsor buys seats, so no counter, no
// external dependency and nothing to break when a backing service is down.
const RULES={CATERSTUDIOS:{percent:50,label:'Cater Studios'}};
const priceFor=percent=>Math.round(FULL_PRICE*(1-percent/100));
const normalise=code=>typeof code==='string'?code.trim().toUpperCase().replace(/[\s_-]+/g,''):'';
function resolve(code){const key=normalise(code);if(!key)return null;const rule=RULES[key];if(!rule||!Number.isInteger(rule.percent)||rule.percent<1||rule.percent>=100)return null;const amount=priceFor(rule.percent);if(!Number.isInteger(amount)||amount<100)return null;return {code:key,percent:rule.percent,label:rule.label,amount,original:FULL_PRICE,discount:FULL_PRICE-amount};}
const validAmounts=()=>[...new Set([FULL_PRICE,...Object.values(RULES).map(r=>priceFor(r.percent))])];
const isValidAmount=amount=>Number.isInteger(amount)&&validAmounts().includes(amount);
const naira=amount=>'₦'+(Number(amount||0)/100).toLocaleString('en-NG',{maximumFractionDigits:2});
module.exports={FULL_PRICE,RULES,resolve,validAmounts,isValidAmount,naira};
