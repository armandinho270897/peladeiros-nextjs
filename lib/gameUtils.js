export const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return { dow: DOW[dt.getDay()], dom: String(d).padStart(2, '0') };
}

export function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function normalizeWhatsapp(w) {
  return (w || '').replace(/\D/g, '');
}

export function confirmadosDe(g) {
  return (g.confirmacoes || []).filter((c) => c.status === 'confirmado');
}

export function esperaDe(g) {
  return (g.confirmacoes || []).filter((c) => c.status === 'espera');
}

export function shareUrl(gameId) {
  return `${window.location.origin}/pelada/${gameId}`;
}
