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

// Link universal do Google Maps: no navegador abre maps.google.com, no
// celular abre o app nativo pra navegação turn-by-turn — mesmo destino de
// URL nos dois casos, sem precisar detectar plataforma.
export function googleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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

// Compartilhado entre PeladaAbas (pra saber se libera/gruda a aba de chat) e
// PeladaChat (que faz a mesma checagem antes de buscar mensagens) — mesma
// condição, um lugar só.
export function souAprovadoDe(g, userId) {
  return (g.confirmacoes || []).some((c) => c.user_id === userId && c.status === 'aprovado');
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

// Status de vagas mais informativo que só o número. "Aberta"/"Lotada" são
// estados neutros (não são ação nem algo destrutivo), então ficam cinza; só
// "últimas vagas" usa o dourado de urgência já usado no resto do app (ex:
// prazo de confirmação). Compartilhado entre GameCard e NextGameHero pra não
// divergir limiar/wording entre os dois cards.
export function statusVagas(restantes, lotado) {
  if (lotado) return { label: '🔴 Lotada', className: 'lotada' };
  if (restantes <= 3) return { label: `🔥 Últimas ${restantes} vaga${restantes === 1 ? '' : 's'}`, className: 'ultimas' };
  return { label: `🟢 Aberta · ${restantes} vagas`, className: 'aberta' };
}

export const MODALIDADES = [
  { value: 'futebol_campo', label: 'Futebol de Campo' },
  { value: 'society', label: 'Society' },
  { value: 'futsal', label: 'Futsal' },
  { value: 'futebol_areia', label: 'Futebol de Areia' },
  { value: 'futebol_5', label: 'Futebol de 5' },
  { value: 'futebol_8_9', label: 'Futebol de 8-9' },
];

export const MODALIDADE_LABEL = Object.fromEntries(MODALIDADES.map((m) => [m.value, m.label]));

export const POSICAO_LABEL = {
  goleiro: 'Goleiro',
  goleiro_linha: 'Goleiro-linha',
  zagueiro: 'Zagueiro',
  lateral: 'Lateral',
  lateral_direito: 'Lateral-direito',
  lateral_esquerdo: 'Lateral-esquerdo',
  libero: 'Líbero',
  ala: 'Ala',
  ala_direito: 'Ala-direito',
  ala_esquerdo: 'Ala-esquerdo',
  fixo: 'Fixo',
  volante: 'Volante',
  meia: 'Meia',
  meia_direita: 'Meia-direita',
  meia_esquerda: 'Meia-esquerda',
  meia_central: 'Meia central',
  meia_atacante: 'Meia-atacante',
  meio_campista: 'Meio-campista',
  ponta: 'Ponta',
  ponta_direita: 'Ponta-direita',
  ponta_esquerda: 'Ponta-esquerda',
  atacante: 'Atacante',
  centroavante: 'Centroavante',
  segundo_atacante: 'Segundo atacante',
  falso_9: 'Falso 9',
  pivo: 'Pivô',
  defensor: 'Defensor',
};

// Posições por modalidade, agrupadas por categoria (Goleiro/Defesa/Meio-campo/
// Ataque) — fonte única usada no formulário de perfil (EditProfileModal),
// na exibição da fila de pendentes (ManageModal) e na escalação visual
// (EscalacaoField). A validação no banco (migration 022) replica essas
// mesmas listas em SQL — mudar aqui não muda lá, então os dois lados
// precisam ser atualizados juntos se a lista de posições mudar.
export const POSICOES_POR_MODALIDADE = {
  futebol_campo: [
    { categoria: 'Goleiro', opcoes: ['goleiro'] },
    { categoria: 'Defesa', opcoes: ['zagueiro', 'lateral_direito', 'lateral_esquerdo', 'libero'] },
    { categoria: 'Meio-campo', opcoes: ['volante', 'meia_direita', 'meia_esquerda', 'meia_central', 'meia_atacante'] },
    { categoria: 'Ataque', opcoes: ['ponta_direita', 'ponta_esquerda', 'segundo_atacante', 'centroavante', 'falso_9'] },
  ],
  society: [
    { categoria: 'Goleiro', opcoes: ['goleiro'] },
    { categoria: 'Defesa', opcoes: ['zagueiro', 'lateral', 'ala'] },
    { categoria: 'Meio-campo', opcoes: ['volante', 'meia', 'meia_atacante'] },
    { categoria: 'Ataque', opcoes: ['ponta', 'atacante', 'centroavante'] },
  ],
  futsal: [
    { categoria: 'Goleiro', opcoes: ['goleiro', 'goleiro_linha'] },
    { categoria: 'Defesa', opcoes: ['fixo'] },
    { categoria: 'Meio-campo', opcoes: ['ala_direito', 'ala_esquerdo'] },
    { categoria: 'Ataque', opcoes: ['pivo'] },
  ],
  futebol_areia: [
    { categoria: 'Goleiro', opcoes: ['goleiro'] },
    { categoria: 'Defesa', opcoes: ['defensor'] },
    { categoria: 'Meio-campo', opcoes: ['meio_campista'] },
    { categoria: 'Ataque', opcoes: ['atacante'] },
  ],
  // Sem categorias — diferente das outras modalidades, foi especificada
  // como lista única (sem separador "|"), então fica uma lista só.
  futebol_5: [
    { categoria: null, opcoes: ['goleiro', 'defensor', 'ala', 'pivo'] },
  ],
  futebol_8_9: [
    { categoria: 'Goleiro', opcoes: ['goleiro'] },
    { categoria: 'Defesa', opcoes: ['zagueiro', 'lateral_direito', 'lateral_esquerdo'] },
    { categoria: 'Meio-campo', opcoes: ['volante', 'meia', 'meia_atacante'] },
    { categoria: 'Ataque', opcoes: ['ponta_direita', 'ponta_esquerda', 'atacante', 'centroavante'] },
  ],
};

// Zona ampla (goleiro/defesa/meio/ataque) de uma posição, pra agrupar a
// escalação visual sem precisar saber a modalidade do jogo — a categoria
// de cada posição é sempre a mesma em qualquer modalidade em que ela
// aparece, então dá pra achatar tudo num único mapa slug -> zona. Entradas
// sem categoria (futebol_5, que não tem "|" na especificação) não entram
// aqui — não têm info própria de zona, e não podem sobrescrever a
// categoria real vinda de outra modalidade pra esses mesmos slugs
// (defensor/ala/pivo também aparecem em modalidades com categoria).
export const POSICAO_ZONA = Object.fromEntries(
  Object.values(POSICOES_POR_MODALIDADE).flatMap((categorias) =>
    categorias
      .filter(({ categoria }) => categoria)
      .flatMap(({ categoria, opcoes }) => opcoes.map((o) => [o, categoria]))
  )
);

export function shareUrl(gameId) {
  return `${window.location.origin}/pelada/${gameId}`;
}

// Peladas são sempre marcadas no horário de Brasília — fixa esse offset em
// vez de deixar o "new Date" depender do fuso de quem tá rodando o código
// (navegador do usuário, servidor Node, sessão do Postgres podem discordar).
// O Brasil não usa mais horário de verão, então -03:00 vale o ano todo.
export function inicioDoJogo(game) {
  return new Date(`${game.data}T${game.horario}-03:00`);
}

export function jaAconteceu(game) {
  if (!game?.data || !game?.horario) return false;
  return inicioDoJogo(game).getTime() <= Date.now();
}

// "Em cima da hora": usado tanto pro aviso de cancelar presença quanto pro
// aviso de cancelar a pelada inteira — mesmo limiar de 3h pros dois casos.
export const LIMITE_EM_CIMA_DA_HORA_MS = 3 * 60 * 60 * 1000;

export function emCimaDaHora(game) {
  if (!game?.data || !game?.horario) return false;
  const diff = inicioDoJogo(game).getTime() - Date.now();
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
