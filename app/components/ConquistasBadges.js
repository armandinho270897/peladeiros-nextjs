const ICONE = {
  primeira_pelada: '⚽',
  cinco_peladas: '🔥',
  dez_peladas: '💪',
  avaliacao_cinco: '⭐',
  brabo_que_comanda: '👑',
};

export default function ConquistasBadges({ conquistas }) {
  if (!conquistas || conquistas.length === 0) return null;

  return (
    <div className="pl-conquistas">
      {conquistas.map((c) => (
        <div key={c.id} className={`pl-conquista ${c.desbloqueada ? 'desbloqueada' : ''}`} title={c.descricao}>
          <div className="pl-conquista-icone">{ICONE[c.id] || '🏅'}</div>
          <div className="pl-conquista-titulo">{c.titulo}</div>
        </div>
      ))}
    </div>
  );
}
