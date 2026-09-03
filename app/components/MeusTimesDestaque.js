'use client';
import Link from 'next/link';
import Avatar from './Avatar';

// Times ganha um lugar de verdade na Home — antes só existia dentro do
// Perfil (um botão pequeno + uma seção mais abaixo), então quem não abria
// o Perfil nunca via que tinha time. Recebe `times` já pronto do mesmo
// /api/perfil que a Home já carrega pra tudo mais (perfil?.times) — sem
// fetch próprio, evita repetir a mesma consulta duas vezes na mesma tela.
// undefined = ainda carregando (perfil ainda não chegou), [] = carregado e
// vazio (mostra convite pra criar/entrar em vez de sumir).
export default function MeusTimesDestaque({ times }) {
  if (times === undefined) {
    return (
      <div className="pl-destaque-row pl-reveal pl-reveal-3">
        {[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ width: 120, height: 128, flexShrink: 0, borderRadius: 'var(--radius-md)' }} />)}
      </div>
    );
  }

  return (
    <div className="pl-reveal pl-reveal-3">
      <div className="pl-destaque-title">Seus times</div>
      <div className="pl-destaque-row">
        {times.map((t) => (
          <Link key={t.id} href={`/time/${t.id}`} className="pl-time-destaque-card">
            <Avatar nome={t.nome} size={52} fotoUrl={t.escudo_url} />
            <span className="pl-time-destaque-nome">{t.nome}</span>
            <span className="pl-time-destaque-papel">{t.papel === 'capitao' ? 'Capitão' : 'Membro'}</span>
          </Link>
        ))}
        <Link href="/times" className="pl-time-destaque-card pl-time-destaque-card-novo">
          <span className="pl-time-destaque-novo-icone">+</span>
          <span className="pl-time-destaque-nome">{times.length === 0 ? 'Criar ou entrar' : 'Outro time'}</span>
        </Link>
      </div>
    </div>
  );
}
