// Tag é texto livre digitado em cada avaliação (AvaliarModal) — até agora
// só era gravado no banco, nunca aparecia em lugar nenhum. /api/perfil já
// devolve as mais recebidas agrupadas e contadas; aqui só rende como selo,
// reaproveitando a mesma pílula visual de .pl-bairro-tag/.pl-tipo-tag.
export default function PerfilTags({ tags }) {
  if (!tags || tags.length === 0) return null;

  return (
    <>
      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Tags recebidas</div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map((t) => (
          <span key={t.tag} className="pl-tipo-tag">{t.tag}{t.count > 1 && ` · ${t.count}`}</span>
        ))}
      </div>
    </>
  );
}
