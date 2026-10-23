/* Clira private lead desk — filters live, segments wired, upsell messages active. */
(() => {
const M=window.CliraModel,$=id=>document.getElementById(id),store='visority_clira_key';
let key='';try{key=sessionStorage.getItem(store)||'';}catch{}

/*
  state.filter  : 'All' | pipeline status label
  state.segment : 'All' | 'Free' | 'Premium'
*/
const state={leads:[],filter:'All',segment:'All',ambassador:'All',view:'leads',query:'',selected:null,drafts:new Map(),demo:false,loading:false,saving:false,opener:null};

function el(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;}
const lid=l=>String(l.rowNumber||l.email||state.leads.indexOf(l));
/* Normalised email is only ever a fallback identifier — trim + lowercase so
 * "Divine@gmail.com" and "divine@gmail.com " resolve to the same lead. */
const leadEmail=l=>M.text(l.email).toLowerCase();
/* Stable identifier when the sheet exposes a row number (preferred over email). */
const leadRow=l=>{const n=Number(l.rowNumber);return Number.isInteger(n)&&n>0?n:0;};
const date=v=>{const d=new Date(v);return v&&!isNaN(d)?d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Not provided';};
function setKey(v){key=v;try{v?sessionStorage.setItem(store,v):sessionStorage.removeItem(store);}catch{}}

async function request(method,payload){
  const r=await fetch('/api/clira-leads',{method,headers:{'X-Clira-Key':key,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store',signal:AbortSignal.timeout(30000)});
  let d;try{d=await r.json();}catch{throw Error('The connection returned an unreadable response. Try again.');}
  if(!r.ok){const e=Error(d.error||'Could not complete the request. Try again.');e.status=r.status;throw e;}
  return d;
}

function auth(message=''){if($('detail').open)closePanel();state.leads=[];state.drafts.clear();render();$('workspace').inert=true;$('auth-error').textContent=message;if(!$('auth').open)$('auth').showModal();$('key').focus();}
function notify(message){$('toast').textContent=message;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,2500);}

async function load(){
  if(state.loading)return;state.loading=true;$('refresh').disabled=true;$('refresh').textContent='Refreshing…';$('error').hidden=true;$('rows').setAttribute('aria-busy','true');
  if(!state.leads.length)$('rows').replaceChildren(...Array.from({length:5},()=>el('div','loading-row')));
  try{
    const d=await request('GET');
    if(!Array.isArray(d.leads))throw Error('The connection did not return a lead list.');
    state.leads=d.leads;state.demo=d.demo===true;$('demo').hidden=!state.demo;$('auth').close();$('workspace').inert=false;$('key').value='';
    $('sync').textContent='Synced '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    render();
  }catch(e){
    if(e.status===401){setKey('');auth('That access key was not accepted.');}
    else{$('error-text').textContent=e.message;$('error').hidden=false;render();}
  }finally{
    state.loading=false;$('refresh').disabled=false;$('refresh').textContent='Refresh leads ↻';$('unlock').disabled=false;$('rows').setAttribute('aria-busy','false');
  }
}

/* ---- Filtering helpers ---- */
function matchesFilter(l){
  if(state.view==='followups') return M.status(l.status)==='Follow Up';
  if(state.filter!=='All'&&M.status(l.status)!==state.filter) return false;
  return true;
}
function matchesSegment(l){
  if(state.segment==='All') return true;
  return M.segment(l.ticket)===state.segment;
}
function matchesQuery(l){
  const q=M.text(state.query).toLowerCase();
  if(!q) return true;
  return [l.name,l.email,l.phone].some(x=>M.text(x).toLowerCase().includes(q));
}
function matchesAmbassador(l){
  if(state.ambassador==='All') return true;
  const ref=M.getLeadReferral(l);
  if(state.ambassador==='Direct') return ref.type==='direct';
  return ref.code===state.ambassador;
}
function visibleLeads(){
  return state.leads.filter(l=>matchesFilter(l)&&matchesSegment(l)&&matchesAmbassador(l)&&matchesQuery(l));
}

/* Count leads matching a pipeline status + current segment */
function countForStatus(s){
  return state.leads.filter(l=>{
    const ok=(s==='All'||M.status(l.status)===s);
    const seg=matchesSegment(l);
    return ok&&seg;
  }).length;
}

function choose(filter){state.filter=filter;render();}
function chooseSegment(seg){state.segment=seg;render();}
function chooseAmbassador(code){
  state.ambassador=code;
  const sel=$('ambassador-filter');
  if(sel&&sel.value!==code) sel.value=code;
  render();
}

/* ---- Main render ---- */
function render(){
  const pipelineStatuses=['All','New','Follow Up','Contacted','Registered'];

  /* Queue count (always full list) */
  $('queue-count').textContent=state.leads.filter(l=>M.status(l.status)==='Follow Up').length;

  /* Stats tiles — counts respect current segment but not status filter */
  $('stats').replaceChildren(...[
    ['All','Leads'],['New','New'],['Follow Up','Need follow-up'],['Registered','Registered']
  ].map(([s,label])=>{
    const b=el('button');b.type='button';
    b.setAttribute('aria-pressed',String(state.filter===s));
    b.append(el('strong','',countForStatus(s)),el('span','',label));
    b.onclick=()=>{if(state.view==='followups'&&s!=='Follow Up')setView('leads');choose(s);};
    return b;
  }));

  /* Segment tabs: Free / Premium / All */
  const segBar=$('segment-bar');
  if(segBar){
    const segs=['All','Free','Premium'];
    segBar.replaceChildren(...segs.map(seg=>{
      const cnt=seg==='All'
        ? state.leads.length
        : state.leads.filter(l=>M.segment(l.ticket)===seg).length;
      const b=el('button');b.type='button';
      b.setAttribute('aria-pressed',String(state.segment===seg));
      b.className='seg-tab'+(state.segment===seg?' active':'');
      b.setAttribute('data-seg',seg);
      b.innerHTML=`${seg} <b>${cnt}</b>`;
      b.onclick=()=>chooseSegment(seg);
      return b;
    }));
  }

  /* Pipeline filter tabs */
  $('filters').replaceChildren(...pipelineStatuses.map(s=>{
    const b=el('button','',s==='All'?'All':M.label(s));b.type='button';
    b.setAttribute('aria-pressed',String(state.filter===s));
    b.onclick=()=>choose(s);return b;
  }));
  $('filters').hidden=state.view==='followups';

  /* Ambassador counts and summary */
  const ambSummary=$('ambassador-summary');
  if(ambSummary){
    const counts={VSR001:0,VSR002:0,VSR003:0,Direct:0};
    for(const l of state.leads){
      const ref=M.getLeadReferral(l);
      if(ref.type==='ambassador'&&counts[ref.code]!==undefined) counts[ref.code]++;
      else if(ref.type==='direct') counts.Direct++;
    }
    const items=[
      ['VSR001','Eniola',counts.VSR001],
      ['VSR002','Deborah',counts.VSR002],
      ['VSR003','Divine',counts.VSR003],
      ['Direct','Direct',counts.Direct],
    ];
    ambSummary.replaceChildren(
      el('span','ambassador-summary-title','Ambassador referrals'),
      ...items.map(([code,name,count])=>{
        const b=el('button','ambassador-pill');
        b.type='button';
        b.setAttribute('aria-pressed',String(state.ambassador===code));
        b.append(document.createTextNode(name+' '),el('strong','',count));
        b.onclick=()=>chooseAmbassador(state.ambassador===code?'All':code);
        return b;
      })
    );
  }
  const ambFilter=$('ambassador-filter');
  if(ambFilter&&ambFilter.value!==state.ambassador){
    ambFilter.value=state.ambassador;
  }

  /* Lead rows */
  const leads=visibleLeads();
  $('list-count').textContent=`${leads.length} ${leads.length===1?'lead':'leads'}${state.query?' found':''}`;
  $('rows').replaceChildren(...leads.map(row));
  $('empty').hidden=!!leads.length;
  $('empty-title').textContent=state.query?'No matching leads':state.view==='followups'?'You’re all caught up':state.ambassador!=='All'?'No leads from this ambassador yet':'No leads in this view';
  $('empty-copy').textContent=state.query?'Try another name, email or phone number.':state.view==='followups'?'Mark someone as Follow-up when they need another conversation.':state.ambassador!=='All'?'Leads referred by this ambassador will appear here once registered.':'Choose All to see your leads, or refresh for new registrations.';
}

/* ---- Lead row ---- */
function row(l){
  const isFree=M.isFree(l.ticket);
  const isPrem=M.isPremium(l.ticket);
  const segClass=isFree?' seg-free':isPrem?' seg-premium':'';
  const b=el('button','lead-row'+(state.view==='followups'?' followup-row':'')+segClass);
  b.type='button';b.dataset.lead=lid(l);
  const identity=el('span','identity');
  identity.append(
    el('strong','',l.name||'Unnamed lead'),
    el('small','',state.view==='followups'
      ?[l.role,l.challenge].filter(Boolean).join(' · ')
      :l.email||l.phone||'No contact details')
  );
  b.append(identity);
  if(state.view==='followups'){
    b.append(el('span','context-note',l.note||M.summary(l)));
  } else {
    const role=el('span','role',l.role||'Role not provided');
    const mobile=el('span','mobile-pass',' · '+M.pass(l.ticket));
    role.append(mobile);
    const passLabel=M.pass(l.ticket);
    const passClass='pass'+(isPrem?' premium':isFree?' free':'');
    b.append(
      role,
      el('span',passClass,passLabel),
      el('span','status-chip status-'+M.label(l.status).toLowerCase().replace(/\s/g,'-'),M.label(l.status))
    );
  }
  b.append(el('span','row-arrow','Open ↗'));
  b.onclick=()=>openPanel(l,b);
  return b;
}

/* ---- View switch ---- */
function setView(v){
  state.view=v;state.filter=v==='followups'?'Follow Up':'All';
  document.querySelectorAll('[data-view]').forEach(b=>{
    if(b.dataset.view===v)b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  });
  $('heading').replaceChildren();
  if(v==='followups') $('heading').textContent='Who needs attention?';
  else{$('heading').append(document.createTextNode('Your leads.'),el('br'),el('span','','Keep the conversation moving.'));}
  $('intro-copy').textContent=v==='followups'
    ?'A short list of conversations to pick back up. Start with the last note.'
    :'See who registered, understand what they need, and follow up while the conversation is still warm.';
  document.body.classList.toggle('followups',v==='followups');
  render();
}

/* ---- Draft management ---- */
function draft(l){
  if(!state.drafts.has(lid(l))) state.drafts.set(lid(l),{message:M.message(l),note:M.text(l.note),status:M.status(l.status),variant:0});
  return state.drafts.get(lid(l));
}

/* ---- Detail panel ---- */
function contact(target,value,prefix){const n=$(target);n.replaceChildren();if(value){const a=el('a','',value);a.href=prefix+value;n.append(a);}else n.textContent='Not provided';}

function openPanel(l,opener){
  state.selected=l;state.opener=opener;
  const d=draft(l);
  const seg=M.segment(l.ticket);
  $('lead-name').textContent=l.name||'Unnamed lead';
  $('avatar').textContent=M.text(l.name).split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'—';
  $('lead-meta').textContent=[l.role,M.pass(l.ticket)+' pass'].filter(Boolean).join(' · ');

  /* Segment badge in detail header */
  const badge=$('lead-segment-badge');
  if(badge){
    badge.textContent=seg==='Free'?'Free pass — upgrade available':seg==='Premium'?'Premium pass':'Pass not selected';
    badge.className='segment-badge seg-badge-'+seg.toLowerCase();
  }

  contact('lead-email',l.email,'mailto:');
  contact('lead-phone',l.phone,'tel:');
  $('lead-date').textContent=date(l.date);
  $('lead-current-status').textContent=M.label(l.status);
  $('summary').textContent=M.summary(l);
  const ref=M.getLeadReferral(l);
  const refDisplay=ref.type==='ambassador'?`${ref.name} · ${ref.code}`:ref.type==='unknown'?(ref.code?`Unknown · ${ref.code}`:'Unknown referral'):'Direct';
  $('answers').replaceChildren(...[
    ['Role',l.role],['Biggest challenge',l.challenge],['What they want',l.goal],['Why Visority',l.reason],
    ['Referred by', refDisplay]
  ].map(([label,value])=>{const div=el('div');div.append(el('dt','',label),el('dd','',value||'Not provided'));return div;}));
  $('message').value=d.message;
  $('status').value=d.status;
  $('note').value=d.note;
  $('save-state').textContent='';$('copy').textContent='Copy';

  /* Upsell hint for free leads */
  const upsellHint=$('upsell-hint');
  if(upsellHint) upsellHint.hidden=seg!=='Free';

  paintWhatsapp();
  if(!$('detail').open)$('detail').showModal();
  document.body.style.overflow='hidden';
  document.querySelector('.detail-body').scrollTop=0;
  $('close-detail').focus();
}

function closePanel(){
  if(state.saving)return;
  $('detail').close();document.body.style.overflow='';state.selected=null;
  const rowEl=[...document.querySelectorAll('.lead-row')].find(b=>b.dataset.lead===state.opener?.dataset.lead);
  (rowEl||$('search')).focus();
}

function paintWhatsapp(){
  const valid=state.selected&&M.phone(state.selected.phone);
  $('whatsapp').disabled=!valid||!$('message').value.trim();
  $('wa-help').textContent=valid?'Opens a draft. You choose when to send.':'No valid WhatsApp number. You can still copy the message.';
}

/* ---- Event wiring ---- */
$('message').oninput=()=>{if(state.selected)draft(state.selected).message=$('message').value;paintWhatsapp();};
$('note').oninput=()=>{if(state.selected)draft(state.selected).note=$('note').value;};
$('status').onchange=()=>{if(state.selected)draft(state.selected).status=$('status').value;};

$('regenerate').onclick=()=>{
  const d=draft(state.selected);
  if(d.message!==M.message(state.selected,d.variant)&&!confirm('Replace your edited message with a new suggestion?'))return;
  d.message=M.message(state.selected,++d.variant);
  $('message').value=d.message;paintWhatsapp();
};

$('copy').onclick=async()=>{
  try{await navigator.clipboard.writeText($('message').value);$('copy').textContent='Copied';}
  catch{$('message').focus();$('message').select();$('copy').textContent='Select and copy';}
};

$('whatsapp').onclick=()=>{
  const number=M.phone(state.selected?.phone);
  if(number&&$('message').value.trim())window.open('https://wa.me/'+number+'?text='+encodeURIComponent($('message').value.trim()),'_blank','noopener');
};

$('save').onclick=async()=>{
  if(state.saving||!state.selected)return;
  const l=state.selected,d=draft(l),payload={action:'update',email:leadEmail(l)};
  if(leadRow(l))payload.rowNumber=leadRow(l);
  if(d.status!==M.status(l.status))payload.status=d.status;
  if(d.note.trim()!==M.text(l.note)){if(!d.note.trim()){$('save-state').textContent='To replace the saved note, enter a short note.';return;}payload.note=d.note.trim();}
  if(!payload.status&&!payload.note){$('save-state').textContent='No changes to save.';return;}
  state.saving=true;
  for(const x of ['save','status','note','close-detail'])$(x).disabled=true;
  $('save').textContent='Saving…';$('save-state').textContent='';
  try{
    const result=await request('POST',payload);
    if(!result.ok&&!result.savedLocally)throw Error('The sheet did not confirm the save. Refresh before retrying.');
    if(payload.status)l.status=payload.status;
    if(payload.note!==undefined)l.note=payload.note;
    $('lead-current-status').textContent=M.label(l.status);
    $('save-state').textContent=result.savedLocally?'Saved in this preview session.':'Saved to Google Sheets.';
    $('save').textContent='Saved';
    setTimeout(()=>{if($('save').textContent==='Saved')$('save').textContent='Save changes';},1600);
    render();
  }catch(e){
    /* Keep the raw sheet/connector detail for developers, show the user a short line. */
    console.error('Clira save failed:',e);
    $('save-state').textContent=e.status===409?'Could not update this lead. Refresh and try again.':(e.message||'Could not save. Try again.');
  }
  finally{
    state.saving=false;
    for(const x of ['save','status','note','close-detail'])$(x).disabled=false;
    if($('save').textContent!=='Saved')$('save').textContent='Save changes';
  }
};

$('detail').addEventListener('cancel',e=>{e.preventDefault();closePanel();});
$('close-detail').onclick=closePanel;
$('auth').addEventListener('cancel',e=>e.preventDefault());
$('auth-form').onsubmit=e=>{e.preventDefault();$('unlock').disabled=true;setKey($('key').value.trim());load();};
$('refresh').onclick=load;$('retry').onclick=load;
$('search').oninput=e=>{state.query=e.target.value;render();};
const ambFilter=$('ambassador-filter');if(ambFilter)ambFilter.onchange=e=>chooseAmbassador(e.target.value);
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('lock').onclick=()=>{setKey('');auth();};

render();if(key)load();else auth();
})();
