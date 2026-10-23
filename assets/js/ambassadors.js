// Single source of truth for vanity-code attribution.
(function (root) {
  const ambassadors = {
    VSR001: { name: 'Israelchima', active: true },
    VSR002: { name: 'MsDebs', active: true },
    VSR003: { name: 'Chiamaka Ajuzie', active: true },
    VSR004: { name: 'Special', active: true },
  };

  function resolve(code) {
    const canonical = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const entry = /^VSR\d{3}$/.test(canonical) && ambassadors[canonical];
    return entry?.active ? { code: canonical, name: entry.name } : null;
  }

  const exp = { ambassadors, resolve };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exp;
  } else {
    root.VisorityAmbassadors = exp;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);