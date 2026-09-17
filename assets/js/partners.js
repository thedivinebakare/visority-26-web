(() => {
  const form=document.getElementById('partner-form');if(!form)return;
  document.querySelectorAll('[data-partner-type]').forEach(a=>a.addEventListener('click',()=>{document.getElementById('partner-type').value=a.dataset.partnerType;}));
  let busy=false;form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const get=id=>document.getElementById(id),v=id=>get(id).value.trim(),error=get('partner-error'),result=get('partner-result');error.hidden=true;
    if(!v('partner-org')||!v('partner-type')||!v('partner-contact')){error.textContent='Enter your organisation, partnership type and contact details.';error.hidden=false;form.querySelector(':invalid')?.focus();return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('partner-contact'))&&!/^\+[\d\s()-]{7,24}$/.test(v('partner-contact'))){error.textContent='Enter a valid email or a WhatsApp number with its country code.';error.hidden=false;get('partner-contact').focus();return;}
    busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;button.textContent='SENDING…';
    const payload={source:'partnership_modal',organization:v('partner-org'),partnershipType:v('partner-type'),communitySize:v('partner-reach'),contact:v('partner-contact'),note:v('partner-note'),submittedAt:new Date().toISOString()};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{const response=await fetch(window.PARTNER_SHEETS_WEBHOOK_URL||'https://script.google.com/macros/s/AKfycbwPwN7HEGUUfGmW2JRLHaxB1h5fbAvY2rwbWD7Ain_9lx0zwFX-4DJ5v9Y8VzvJmEse/exec',{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(payload).toString(),signal:controller.signal});if(response.type!=='opaque'&&!response.ok)throw new Error();result.hidden=false;result.textContent='Your enquiry has been sent. We can’t confirm receipt here yet. For a follow-up, email nextgencon01@gmail.com.';button.hidden=true;}
    catch{error.textContent='We couldn’t confirm delivery. Your details are still here. Please contact nextgencon01@gmail.com before retrying.';error.hidden=false;}
    finally{clearTimeout(timer);busy=false;button.disabled=false;button.innerHTML='SEND ENQUIRY <span>↗</span>';}
  });
})();
