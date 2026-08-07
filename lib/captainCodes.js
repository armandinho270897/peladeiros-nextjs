const KEY = 'peladeiros:codigos';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function saveCaptainCode(gameId, codigo) {
  const all = readAll();
  all[gameId] = codigo;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getCaptainCode(gameId) {
  return readAll()[gameId] || null;
}
