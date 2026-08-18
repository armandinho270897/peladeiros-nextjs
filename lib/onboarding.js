const KEY = 'peladeiros:onboarding-visto';

export function isOnboardingSeen() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // sem localStorage, não insiste toda hora
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // localStorage indisponível — segue sem persistir
  }
}
