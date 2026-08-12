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

export function aprovadosDe(g) {
  return (g.confirmacoes || []).filter((c) => c.status === 'aprovado');
}

// Diferente de aprovadosDe: inclui quem já garantiu vaga (aprovado) e quem
// tá com vaga reservada aguardando o segundo clique de confirmação — usado
// só pra contar vagas restantes, não pra avatares/escalação (que querem só
// presença fechada de verdade).
export function ocupandoVagaDe(g) {
  return (g.confirmacoes || []).filter((c) => c.status === 'aprovado' || c.status === 'aguardando_confirmacao');
}

export function aguardandoConfirmacaoDe(g) {
  return (g.confirmacoes || []).filter((c) => c.status === 'aguardando_confirmacao');
}

export function pendentesDe(g) {
  return (g.confirmacoes || []).filter((c) => c.status === 'pendente');
}

export function esperaDe(g) {
  return (g.confirmacoes || []).filter((c) => c.status === 'espera');
}

export const POSICAO_LABEL = {
  goleiro: 'Goleiro',
  zagueiro: 'Zagueiro',
  meio: 'Meio',
  atacante: 'Atacante',
  qualquer: 'Qualquer posição',
};

export function shareUrl(gameId) {
  return `${window.location.origin}/pelada/${gameId}`;
}

// "Em cima da hora": usado tanto pro aviso de cancelar presença quanto pro
// aviso de cancelar a pelada inteira — mesmo limiar de 3h pros dois casos.
export const LIMITE_EM_CIMA_DA_HORA_MS = 3 * 60 * 60 * 1000;

export function emCimaDaHora(game) {
  if (!game?.data || !game?.horario) return false;
  const inicio = new Date(`${game.data}T${game.horario}`);
  const diff = inicio.getTime() - Date.now();
  return diff >= 0 && diff < LIMITE_EM_CIMA_DA_HORA_MS;
}

// Distância em km entre duas coordenadas (fórmula de Haversine) — usada
// pelo filtro de raio, sem depender de nenhuma API paga de geocoding.
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
