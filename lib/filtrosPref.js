// Mesmo padrão de lib/radiusPref.js — localStorage puro, sem dado sensível
// (só as escolhas de filtro/ordenação da Descoberta), tolerante a
// localStorage indisponível (modo privado, navegador antigo).
const KEY = 'peladeiros:filtros-descobrir';

export function getFiltrosPref() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFiltrosPref(filtros) {
  try {
    localStorage.setItem(KEY, JSON.stringify(filtros));
  } catch {
    // localStorage indisponível — segue sem persistir
  }
}
