// Single source of truth for vanity-code attribution.
const ambassadors = {
  VSR001: { name: 'Eniola', active: true },
  VSR002: { name: 'Deborah', active: true },
  VSR003: { name: 'Divine', active: true },
};
function resolve(code) {
  const canonical = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const entry = /^VSR\d{3}$/.test(canonical) && ambassadors[canonical];
  return entry?.active ? { code: canonical, name: entry.name } : null;
}
module.exports = { ambassadors, resolve };
