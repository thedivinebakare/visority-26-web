(() => {
  const btn=document.querySelector('[data-copy-code]');
  if(!btn)return;
  const code=btn.dataset.copyCode,status=document.querySelector('[data-code-status]');
  const say=(text)=>{if(status)status.textContent=text;};
  const flash=()=>{btn.classList.add('is-copied');btn.firstChild.textContent='Copied ';setTimeout(()=>{btn.classList.remove('is-copied');btn.firstChild.textContent='Copy code ';},2000);};
  btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);flash();say('Code copied. Paste it into the discount code box at checkout.');}catch{say('Copy the code manually: '+code);}});
})();
