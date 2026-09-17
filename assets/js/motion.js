(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const hero=document.querySelector('.hero'),portal=document.querySelector('.portal'),title=document.querySelector('.hero-title-wrap');
  let frame=0;
  function paint(){frame=0;if(!hero)return;const offset=Math.max(0,-hero.getBoundingClientRect().top);const active=!reduced.matches&&innerWidth>767&&offset<hero.offsetHeight;portal.style.transform=`translateX(-50%) translateY(${active?offset*.12:0}px) rotate(${24+(active?offset*.008:0)}deg)`;title.style.transform=`translateY(${active?offset*.045:0}px)`;}
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint);};
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});reduced.addEventListener('change',schedule);
  if('IntersectionObserver'in window&&!reduced.matches){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-revealed');observer.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('[data-reveal]').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});}
  document.querySelector('.marquee-pause')?.addEventListener('click',e=>{const paused=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(paused));e.currentTarget.textContent=paused?'Resume motion ↗':'Pause motion Ⅱ';document.querySelector('.audience').classList.toggle('paused',paused);});
})();
