const KEY = 'peladeiros:instalar-dispensado';

export function isInstallBannerDismissed() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallBanner() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // localStorage indisponível — segue sem persistir
  }
}
