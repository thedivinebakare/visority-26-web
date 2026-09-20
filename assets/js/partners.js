(() => {
  const form=document.getElementById('partner-form');if(!form)return;
  document.querySelectorAll('[data-partner-type]').forEach(a=>a.addEventListener('click',()=>{document.getElementById('partner-type').value=a.dataset.partnerType;}));
  let busy=false;form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const get=id=>document.getElementById(id),v=id=>get(id).value.trim(),error=get('partner-error'),result=get('partner-result');error.hidden=true;
    if(!v('partner-org')||!v('partner-type')||!v('partner-contact')){error.textContent='Enter your organisation, partnership type and contact details.';error.hidden=false;form.querySelector(':invalid')?.focus();return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('partner-contact'))&&!/^\+[\d\s()-]{7,24}$/.test(v('partner-contact'))){error.textContent='Enter a valid email or a WhatsApp number with its country code.';error.hidden=false;get('partner-contact').focus();return;}
    busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;button.textContent='SENDING…';
    const payload={source:'partnership_modal',organization:v('partner-org'),partnershipType:v('partner-type'),communitySize:v('partner-reach'),contact:v('partner-contact'),note:v('partner-note'),submittedAt:new Date().toISOString()};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{const response=await fetch('/api/partner-enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});const receipt=await response.json();if(!response.ok||!receipt.saved)throw new Error();result.hidden=false;result.textContent='Your enquiry has been saved. The team will follow up using your contact details.';button.hidden=true;}
    catch{error.textContent='We couldn’t confirm delivery. Your details are still here. Please contact an Admin on +234 810 653 5169 before retrying.';error.hidden=false;}
    finally{clearTimeout(timer);busy=false;button.disabled=false;button.innerHTML='SEND ENQUIRY <span>↗</span>';}
  });
})();
