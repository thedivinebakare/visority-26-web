/* Pure lead presentation helpers. No network calls or automatic messages. */
(function(root){
  const text=v=>String(v??'').trim();
  const status=v=>({'follow-up':'Follow Up','follow up':'Follow Up','interested':'Follow Up','not interested':'Closed','closed':'Closed','contacted':'Contacted','registered':'Registered','new':'New'}[text(v).toLowerCase()]||'New');
  const label=v=>status(v)==='Follow Up'?'Follow-up':status(v);
  const pass=v=>/^(vip|premium)$/i.test(text(v))?'Premium':/^(standard|free)$/i.test(text(v))?'Free':text(v)||'Not selected';

  /* Segment: 'Premium' | 'Free' | 'Unknown' */
  const segment=v=>{const p=pass(v);return p==='Premium'?'Premium':p==='Free'?'Free':'Unknown';};
  const isFree=v=>segment(v)==='Free';
  const isPremium=v=>segment(v)==='Premium';

  function phone(v){let s=text(v).replace(/[^\d]/g,'').replace(/^00/,'');if(/^0[789]\d{9}$/.test(s))s='234'+s.slice(1);return /^[1-9]\d{7,14}$/.test(s)?s:'';}
  const short=v=>{const s=text(v).replace(/\s+/g,' ');return s.length>180?s.slice(0,177)+'…':s;};

  function summary(l){return [l.role?`${text(l.role)}.`:'',l.challenge?`Their challenge: ${short(l.challenge)}`:'',l.goal?`Looking for: ${short(l.goal)}`:'',!l.challenge&&!l.goal?'No challenge or goal was included in the available answers.':''].filter(Boolean).join(' ');}

  /* -----------------------------------------------------------------
     message() — personalised follow-up copy.
     For Free leads: variant 0/2/4 = neutral first-touch,
                     variant 1/3   = subtle upsell nudge.
     For Premium leads: warm confirmation / nudge variants.
     variant is cycled with the Regenerate button.
  ------------------------------------------------------------------ */
  function message(l,variant=0){
    const name=text(l.name).split(/\s+/)[0]||'there';
    const ticketPass=pass(l.ticket);
    const seg=segment(l.ticket);
    const even=variant%2===0;

    if(seg==='Premium'){
      /* Premium leads: affirm their choice, gently push to complete */
      const open=even
        ?`Hey ${name}, it's the Visority team — glad you're joining us on the Premium track.`
        :`Hi ${name}, just checking in from the Visority team.`;
      const parts=[open];
      if(l.challenge) parts.push(`You mentioned "${short(l.challenge)}" — that's exactly the kind of conversation we've built the Premium sessions around.`);
      if(l.goal)      parts.push(`You're looking to "${short(l.goal)}" — our curated Premium track is designed for exactly that.`);
      if(!l.challenge&&!l.goal&&l.reason) parts.push(`You shared "${short(l.reason)}" as your reason for joining — we'd love to make sure you get full value from the Premium experience.`);
      parts.push(even
        ?`Is there anything you need from us to confirm your spot?`
        :`What would make these three days most worthwhile for you?`);
      return parts.join('\n\n');
    }

    if(seg==='Free'){
      /* Free leads: follow up warmly, then plant the upgrade seed */
      if(even){
        /* Even variants: friendly first-touch, soft upgrade mention */
        const open=`Hey ${name}, it's the Visority team — thanks for registering for Visority '26!`;
        const parts=[open];
        if(l.challenge) parts.push(`You mentioned "${short(l.challenge)}" — we'd love to help you work through that.`);
        if(l.goal)      parts.push(`You're looking to "${short(l.goal)}" — we've designed this year's programme with exactly that outcome in mind.`);
        if(!l.challenge&&!l.goal&&l.reason) parts.push(`You shared "${short(l.reason)}" as your reason for joining — we can't wait to see what you take away.`);
        /* Subtle upsell: mention what they'd unlock, not what they're missing */
        parts.push(`Quick note — if you haven't yet, it's worth checking out the Premium pass. It includes dedicated mentorship sessions and access to our curated founder network that many attendees say is the real highlight. No pressure, just want to make sure you have the full picture before the event.`);
        parts.push(`Is there anything I can help clarify before you arrive?`);
        return parts.join('\n\n');
      } else {
        /* Odd variants: follow-up nudge with a stronger (but still soft) case */
        const open=`Hi ${name}, just checking back in from the Visority team.`;
        const parts=[open];
        parts.push(`I wanted to make sure you had everything you need ahead of Visority '26.`);
        if(l.challenge||l.goal){
          const context=[l.challenge?`"${short(l.challenge)}"`:null,l.goal?`"${short(l.goal)}"`:null].filter(Boolean).join(' and ');
          parts.push(`Given what you shared about ${context}, I think you'd get a lot from the Premium experience — the smaller group sessions and direct access to the speaker lineup tend to be where the real breakthroughs happen.`);
        } else {
          parts.push(`A few of our attendees who started on the Standard pass have told us upgrading to Premium was the single best decision they made — the mentorship and networking access alone were worth it.`);
        }
        parts.push(`If you'd like to upgrade or just want more info, I'm happy to walk you through it. Otherwise, is there anything stopping you from completing your registration?`);
        return parts.join('\n\n');
      }
    }

    /* Unknown / no ticket: generic warm follow-up */
    const open=even
      ?`Hey ${name}, it's the Visority team — I saw your Visority registration.`
      :`Hi ${name}, just checking back in from the Visority team.`;
    const parts=[open];
    if(l.challenge) parts.push(`You mentioned "${short(l.challenge)}".`);
    if(l.goal)      parts.push(`You're looking for "${short(l.goal)}"${l.challenge?' too':''}.`);
    if(!l.challenge&&!l.goal&&l.reason) parts.push(`You shared "${short(l.reason)}" as your reason for joining.`);
    parts.push(l.challenge||l.goal?`What would make these three days most useful for you?`:`Is there anything you'd like to know before the conference?`);
    return parts.join('\n\n');
  }

  /* Single source of truth for vanity-code attribution (delegates to assets/js/ambassadors.js). */
  function getRegistry() {
    if (typeof VisorityAmbassadors !== 'undefined' && VisorityAmbassadors.ambassadors) {
      return VisorityAmbassadors;
    }
    if (typeof require !== 'undefined') {
      try {
        return require('./ambassadors.js');
      } catch {
        try {
          return require('../../server/ambassadors.cjs');
        } catch {}
      }
    }
    return {
      ambassadors: {
        VSR001: { name: 'Israelchima', active: true },
        VSR002: { name: 'MsDebs', active: true },
        VSR003: { name: 'Chiamaka Ajuzie', active: true },
        VSR004: { name: 'Special', active: true },
      },
      resolve(codeOrName) {
        if (typeof codeOrName !== 'string') return null;
        const trimmed = codeOrName.trim();
        const canonical = trimmed.toUpperCase();
        if (/^VSR\d{3}$/.test(canonical)) {
          const entry = this.ambassadors[canonical];
          return entry?.active ? { code: canonical, name: entry.name } : null;
        }
        const match = Object.entries(this.ambassadors).find(([_, a]) => a.active && a.name.toLowerCase() === trimmed.toLowerCase());
        return match ? { code: match[0], name: match[1].name } : null;
      }
    };
  }

  const AMBASSADORS = new Proxy({}, {
    get(_, prop) {
      return getRegistry().ambassadors?.[prop];
    },
    ownKeys() {
      return Reflect.ownKeys(getRegistry().ambassadors || {});
    },
    getOwnPropertyDescriptor(_, prop) {
      return Object.getOwnPropertyDescriptor(getRegistry().ambassadors || {}, prop);
    }
  });

  function resolveAmbassador(code) {
    return getRegistry().resolve(code);
  }

  function getLeadReferral(l) {
    if (!l) return { type: 'direct', code: '', name: 'Direct', label: 'Direct' };
    let rawCode = text(l.referralCode || l.referral_code || l.ambassadorCode || l.ambassador_code || l.referredBy || l.referred_by);
    let rawName = text(l.ambassadorName || l.ambassador_name || l.ambassador);
    const registry = getRegistry();

    if (!rawCode && (l.reason || l.customNote)) {
      const note = text(l.reason || l.customNote);
      const match = /Ambassador reference:\s*(VSR\d{3})/i.exec(note) ||
                    /(?:referral|ambassador|ref)\s*[:=]\s*(VSR\d{3})/i.exec(note) ||
                    /\b(VSR00[1-4])\b/i.exec(note);
      if (match) rawCode = match[1].toUpperCase();
    }

    if (rawCode) {
      const resolved = registry.resolve(rawCode);
      if (resolved) {
        return { type: 'ambassador', code: resolved.code, name: resolved.name, label: `${resolved.name} · ${resolved.code}` };
      }
      if (rawName) {
        const resolvedName = registry.resolve(rawName);
        if (resolvedName) {
          return { type: 'ambassador', code: resolvedName.code, name: resolvedName.name, label: `${resolvedName.name} · ${resolvedName.code}` };
        }
      }
      return { type: 'unknown', code: rawCode, name: rawName || 'Unknown referral', label: rawCode ? `Unknown · ${rawCode}` : 'Unknown referral' };
    }

    if (rawName) {
      const resolvedName = registry.resolve(rawName);
      if (resolvedName) {
        return { type: 'ambassador', code: resolvedName.code, name: resolvedName.name, label: `${resolvedName.name} · ${resolvedName.code}` };
      }
      if (/^direct(\s*\/\s*unattributed)?$/i.test(rawName)) {
        return { type: 'direct', code: '', name: 'Direct', label: 'Direct' };
      }
      return { type: 'unknown', code: '', name: rawName, label: rawName };
    }

    return { type: 'direct', code: '', name: 'Direct', label: 'Direct' };
  }

  const api={text,status,label,pass,segment,isFree,isPremium,phone,summary,message,ambassadors:AMBASSADORS,resolveAmbassador,getLeadReferral};
  if(typeof module!=='undefined')module.exports=api;else root.CliraModel=api;
})(globalThis);
