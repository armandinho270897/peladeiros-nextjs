// Campos do formulário de editar perfil que hoje eram só-escrita — o
// modal salvava tudo, mas nenhuma tela mostrava de volta. Compartilhado
// entre app/perfil/page.js (próprio) e app/perfil/[id]/PerfilPublicoClient.js
// (público) pra não duplicar a mesma lista duas vezes. Só renderiza os
// campos preenchidos — nunca aparece "Idade: —" pra quem não informou.
const PE_DOMINANTE_LABEL = { destro: 'Destro', canhoto: 'Canhoto', ambidestro: 'Ambidestro' };

export default function PerfilSobre({ profile }) {
  const campos = [
    profile.idade && { label: 'Idade', value: `${profile.idade} anos` },
    profile.altura_cm && { label: 'Altura', value: `${profile.altura_cm} cm` },
    profile.peso_kg && { label: 'Peso', value: `${profile.peso_kg} kg` },
    profile.pe_dominante && { label: 'Pé dominante', value: PE_DOMINANTE_LABEL[profile.pe_dominante] || profile.pe_dominante },
    profile.time_coracao && { label: 'Time do coração', value: profile.time_coracao },
    profile.disponibilidade && { label: 'Disponibilidade', value: profile.disponibilidade },
    profile.escolinhas && { label: 'Escolinhas', value: profile.escolinhas },
  ].filter(Boolean);

  if (campos.length === 0 && !profile.instagram) return null;

  return (
    <>
      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Sobre</div>
      <div className="pl-ficha-grid">
        {campos.map((c) => (
          <div key={c.label} className="pl-ficha-card">
            <span className="pl-ficha-card-label">{c.label}</span>
            <span className="pl-ficha-card-value">{c.value}</span>
          </div>
        ))}
        {profile.instagram && (
          <div className="pl-ficha-card">
            <span className="pl-ficha-card-label">Instagram</span>
            <a
              className="pl-ficha-card-value"
              style={{ color: 'var(--neon)', textDecoration: 'none' }}
              href={`https://instagram.com/${profile.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram}`}
            </a>
          </div>
        )}
      </div>
    </>
  );
}
