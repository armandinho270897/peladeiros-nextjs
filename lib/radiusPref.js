const KEY = 'peladeiros:raio';

export function getRadiusPref() {
  try {
    const v = localStorage.getItem(KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function saveRadiusPref(km) {
  try {
    if (km == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(km));
  } catch {
    // localStorage indisponível — segue sem persistir
  }
}
