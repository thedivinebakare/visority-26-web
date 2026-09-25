(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(pointer: fine)');
  const gallery=document.querySelector('.hero-gallery');
  let pendingFrame=0,pointerX=0,pointerY=0;
  function resetGallery(){if(!gallery)return;gallery.style.setProperty('--px','0');gallery.style.setProperty('--py','0');}
  gallery?.addEventListener('pointermove',e=>{if(reduced.matches||!fine.matches)return;const r=gallery.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width*2-1;pointerY=(e.clientY-r.top)/r.height*2-1;if(!pendingFrame)pendingFrame=requestAnimationFrame(()=>{gallery.style.setProperty('--px',pointerX.toFixed(3));gallery.style.setProperty('--py',pointerY.toFixed(3));pendingFrame=0;});});
  gallery?.addEventListener('pointerleave',resetGallery);reduced.addEventListener('change',resetGallery);
  if('IntersectionObserver' in window){
    const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-revealed');reveal.unobserve(e.target);}}),{threshold:.12});
    if(!reduced.matches)document.querySelectorAll('[data-reveal]').forEach(el=>{el.classList.add('reveal-ready');reveal.observe(el);});
    reduced.addEventListener('change',()=>{if(reduced.matches){document.querySelectorAll('.reveal-ready').forEach(el=>el.classList.add('is-revealed'));reveal.disconnect();}});
    const dock=document.querySelector('.ticket-dock');let heroVisible=true,pricingVisible=false,footerVisible=false,scheduleVisible=false;
    const updateDock=()=>{if(dock)dock.hidden=heroVisible||pricingVisible||footerVisible||scheduleVisible||!!document.querySelector('dialog[open]');};
    const watch=new IntersectionObserver(entries=>{for(const e of entries){if(e.target.matches('.hero'))heroVisible=e.isIntersecting;if(e.target.id==='pricing')pricingVisible=e.isIntersecting;if(e.target.id==='schedule')scheduleVisible=e.isIntersecting;if(e.target.matches('.site-footer'))footerVisible=e.isIntersecting;}updateDock();},{threshold:0});
    for(const el of document.querySelectorAll('.hero,#pricing,#schedule,.site-footer'))watch.observe(el);
    document.addEventListener('visority:dialog',updateDock);
    const sections=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){document.querySelectorAll('#main-nav a[aria-current]').forEach(a=>a.removeAttribute('aria-current'));document.querySelector(`#main-nav a[href="/#${e.target.id}"]`)?.setAttribute('aria-current','location');}},{rootMargin:'-15% 0px -65% 0px',threshold:0});
    document.querySelectorAll('#experience,#speakers,#schedule,#pricing,#ambassador-program,#skill-fund').forEach(el=>sections.observe(el));
  }
  const pause=document.querySelector('.marquee-pause');pause?.addEventListener('click',()=>{const paused=pause.getAttribute('aria-pressed')!=='true';pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion ↗':'Pause motion Ⅱ';document.querySelector('.audience').classList.toggle('paused',paused);});
  let dialogTrigger=null;
  document.querySelectorAll('[data-open-dialog]').forEach(button=>button.addEventListener('click',()=>{const dialog=document.getElementById(button.dataset.openDialog);if(!dialog)return;dialogTrigger=button;dialog.showModal();document.body.classList.add('dialog-open');document.dispatchEvent(new Event('visority:dialog'));}));
  document.querySelectorAll('.speaker-dialog').forEach(dialog=>{
    dialog.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');dialogTrigger?.focus({preventScroll:true});document.dispatchEvent(new Event('visority:dialog'));});
  });
  document.querySelectorAll('[data-calendar-day]').forEach(button=>button.addEventListener('click',()=>{
    const day=27+Number(button.dataset.calendarDay),title=button.dataset.calendarTitle;
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const escape=text=>text.replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n');
    const data=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NextGen//Visority 26//EN','BEGIN:VEVENT',`UID:visority26-day${button.dataset.calendarDay}@nextgen`,`DTSTAMP:${stamp}`,`DTSTART:202610${day}T190000Z`,`DTEND:202610${day}T210000Z`,`SUMMARY:${escape('Visority 26: '+title)}`,'LOCATION:Online','DESCRIPTION:Joining instructions will be shared by the team.','END:VEVENT','END:VCALENDAR'].join('\r\n');
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type:'text/calendar;charset=utf-8'}));link.href=url;link.download=`visority-26-day-${button.dataset.calendarDay}.ics`;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }));
})();
