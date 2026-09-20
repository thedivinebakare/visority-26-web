(() => {
  const form=document.querySelector('#lead-form');if(!form)return;
  const $=id=>document.getElementById(id),query=new URLSearchParams(location.search);
  const tier=query.get('pass')==='premium'||query.get('tier')==='vip'?'vip':'standard';
  $('current-pass-name').textContent=tier==='vip'?'PREMIUM / ₦5,000':'STANDARD / FREE';
  let step=1,busy=false,started=false,advanceTimer;
  const value=id=>$(id).value.trim();
  function begin(){if(!started){started=true;window.visorityTrack?.('registration_started');}}
  function error(message,input){$('form-error').textContent=message;$('form-error').hidden=false;if(input){input.setAttribute('aria-invalid','true');input.focus();}return false;}
  function valid(n){
    $('form-error').hidden=true;form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
    if(n===1){if(!value('f-name'))return error('Enter your full name.',$('f-name'));if(!value('f-email')||!$('f-email').validity.valid)return error('Enter a valid email address.',$('f-email'));}
    if(n===2&&!value('f-role'))return error('Choose the role that describes you best.');
    if(n===3&&!/^\+[\d\s()-]{7,24}$/.test(value('f-phone')))return error('Enter your WhatsApp number with a country code, for example +234 801 234 5678.',$('f-phone'));
    for(const [s,id,label] of [[4,'f-challenge','challenge'],[5,'f-expect','desired outcome']])if(n===s){if(!value(id))return error(`Choose your ${label}.`);if(value(id)==='Other'&&!value(id+'-other'))return error(`Tell us your ${label}.`,$(id+'-other'));}
    return true;
  }
  function show(n){clearTimeout(advanceTimer);step=n;document.querySelectorAll('.form-step').forEach(el=>el.hidden=Number(el.dataset.step)!==n);$('reg-step-label').textContent=`0${n} — 06`;$('reg-back').hidden=n===1;$('reg-next').hidden=n===6;$('reg-submit').hidden=n!==6;document.querySelector('.progress-fill').style.width=`${n/6*100}%`;document.querySelector('[role=progressbar]').setAttribute('aria-valuenow',String(n));$('form-error').hidden=true;document.querySelector(`[data-step="${n}"] h2`).focus({preventScroll:true});}
  function next(){if(!busy&&step<6&&valid(step))show(step+1);}
  $('reg-next').addEventListener('click',next);$('reg-back').addEventListener('click',()=>show(Math.max(1,step-1)));
  form.addEventListener('input',begin);
  form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&step<6){e.preventDefault();next();}});
  form.querySelectorAll('.choice').forEach(button=>button.addEventListener('click',()=>{begin();clearTimeout(advanceTimer);const group=button.closest('[data-choice]'),id=group.dataset.choice;group.querySelectorAll('.choice').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$(id).value=button.dataset.value;const other=id==='f-challenge'?$('other-challenge'):id==='f-expect'?$('other-expect'):null;if(other)other.hidden=button.dataset.value!=='Other';if(button.dataset.value==='Other')$(id+'-other').focus();else{const selectedStep=step;advanceTimer=setTimeout(()=>{if(step===selectedStep)next();},250);}}));
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;if(step!==6){next();return;}for(let n=1;n<=5;n++){if(!valid(n)){show(n);valid(n);return;}}
    busy=true;begin();$('reg-submit').disabled=true;$('reg-back').disabled=true;$('reg-submit').textContent='SENDING…';
    const chosen=id=>value(id)==='Other'?value(id+'-other'):value(id);
    const payload={fullName:value('f-name'),email:value('f-email'),role:value('f-role'),whatsApp:value('f-phone'),coreChallenge:chosen('f-challenge'),desiredExperience:chosen('f-expect'),customNote:value('f-note'),selectedTier:tier,submittedAt:new Date().toISOString()};
    const endpoint='/api/register';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      const receipt=await response.json();if(!response.ok||!receipt.saved)throw new Error(receipt.message||'Google Sheets did not confirm receipt.');payload.receiptConfirmed=true;
      try{localStorage.setItem(tier==='vip'?'visority_vip_registration':'visority_standard_registration',JSON.stringify(payload));}catch{}
      form.hidden=true;document.querySelector('.form-progress').hidden=true;const result=$('registration-result');result.hidden=false;$('registration-next').href=tier==='vip'?'/checkout/vip/':'/access/standard-confirmation/';result.focus();
      result.querySelector('h2').textContent='Registration confirmed.';result.querySelector('p').textContent='Your details have been saved. Continue to your next steps.';window.visorityTrack?.('registration_completed');location.assign($('registration-next').href);
    }catch(err){error(err.name==='AbortError'?'This is taking longer than expected. Your submission may have arrived. Contact the team before retrying to avoid registering twice.':(err.message||'We couldn’t confirm your registration. Your answers are still here.'));}
    finally{clearTimeout(timeout);busy=false;$('reg-submit').disabled=false;$('reg-back').disabled=false;$('reg-submit').innerHTML='SEND REGISTRATION <span>↗</span>';}
  });
})();
