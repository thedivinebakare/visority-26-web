(() => {
  const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
  const close=()=>{nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');};
  toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
  nav?.addEventListener('click',e=>{if(e.target.closest('a'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true'){close();toggle.focus();}});
  const query=new URLSearchParams(location.search);
  const incoming=query.get('ref');
  window.visorityReferralReady=incoming&&/^[a-z0-9][a-z0-9_-]{2,39}$/.test(incoming)&&!['ambassador','test','preview'].includes(incoming)?fetch('/api/referral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:incoming})}).catch(()=>null):Promise.resolve();
  try{if(query.has('ref'))sessionStorage.setItem('visority_ref',query.get('ref').slice(0,150));}catch{}
  const ref=query.get('ref')||(()=>{try{return sessionStorage.getItem('visority_ref');}catch{return null;}})();
  document.querySelectorAll('a[data-pass]').forEach(a=>{if(ref){const url=new URL(a.href);url.searchParams.set('ref',ref);a.href=url.pathname+url.search;}});
  const legacy=()=>{if(location.pathname!=='/')return;const routes={'#partnerships':'/partners/','#ambassadors':'/ambassadors/','#ambassador-program':'/ambassadors/','#register':'/register/'};const dest=routes[location.hash];if(dest){const url=new URL(dest,location.origin);if(location.hash==='#register')url.searchParams.set('pass',query.get('tier')==='vip'?'premium':'standard');if(ref)url.searchParams.set('ref',ref);location.replace(url.pathname+url.search);}};
  legacy();window.addEventListener('hashchange',legacy);
})();
