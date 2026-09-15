// Checagem de conta ativa, usada nos 3 pontos que a especificação pede
// (criar pelada, confirmar presença, propor arena nova) — não no
// middleware global, pra não bloquear leitura/chat de quem está suspenso.
// 'advertido' continua podendo usar o app normalmente (é só um aviso no
// histórico); só 'suspenso' (dentro do prazo) e 'bloqueado' travam essas
// 3 ações.
export function assertUsuarioAtivo(profile) {
  if (!profile) return null;
  if (profile.status === 'bloqueado') {
    return 'Sua conta foi bloqueada. Entre em contato com a administração pra saber mais.';
  }
  if (profile.status === 'suspenso') {
    const ainda = !profile.suspenso_ate || new Date(profile.suspenso_ate) > new Date();
    if (ainda) {
      const prazo = profile.suspenso_ate ? ` até ${new Date(profile.suspenso_ate).toLocaleDateString('pt-BR')}` : '';
      return `Sua conta está suspensa${prazo}. Não é possível fazer isso agora.`;
    }
  }
  return null;
}
