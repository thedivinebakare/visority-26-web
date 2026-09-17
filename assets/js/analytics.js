(() => {
  const allowed=new Set(['hero_cta_click','ticket_section_view','standard_selected','premium_selected','registration_started','registration_completed','partner_click']);
  window.visorityTrack=(event)=>{if(!allowed.has(event))return;window.dispatchEvent(new CustomEvent('visority:analytics',{detail:{event}}));if(typeof window.plausible==='function')window.plausible(event);};
  document.addEventListener('click',e=>{const target=e.target.closest('[data-track]');if(target)window.visorityTrack(target.dataset.track);});
  const pricing=document.querySelector('#pricing');
  if(pricing&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){window.visorityTrack('ticket_section_view');observer.disconnect();}},{threshold:.15});observer.observe(pricing);}
})();
