// Single source of truth for vanity-code attribution.
(function (root) {
  const ambassadors = {
    VSR001: { name: 'Israelchima', active: true },
    VSR002: { name: 'MsDebs', active: true },
    VSR003: { name: 'Chiamaka Ajuzie', active: true },
    VSR004: { name: 'Special', active: true },
  };

  function resolve(codeOrName) {
    if (typeof codeOrName !== 'string') return null;
    const trimmed = codeOrName.trim();
    const canonical = trimmed.toUpperCase();
    if (/^VSR\d{3}$/.test(canonical)) {
      const entry = ambassadors[canonical];
      return entry?.active ? { code: canonical, name: entry.name } : null;
    }
    const match = Object.entries(ambassadors).find(([_, a]) => a.active && a.name.toLowerCase() === trimmed.toLowerCase());
    return match ? { code: match[0], name: match[1].name } : null;
  }

  const exp = { ambassadors, resolve };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exp;
  } else {
    root.VisorityAmbassadors = exp;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);