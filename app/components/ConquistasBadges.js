import ConquistaAvaliacaoCincoIcon from './ConquistaAvaliacaoCincoIcon';
import ConquistaBraboQueComandaIcon from './ConquistaBraboQueComandaIcon';
import ConquistaPresencaDeFerroIcon from './ConquistaPresencaDeFerroIcon';

const ICONE = {
  avaliacao_cinco: ConquistaAvaliacaoCincoIcon,
  brabo_que_comanda: ConquistaBraboQueComandaIcon,
  presenca_de_ferro: ConquistaPresencaDeFerroIcon,
};

// Só mostra o que já foi desbloqueado — sem selo cinza de "ainda não
// tenho essa" ocupando espaço. Título vem junto (como PerfilSobre/
// PerfilTags) pra não sobrar um "CONQUISTAS" solto quando ninguém foi
// desbloqueada ainda.
export default function ConquistasBadges({ conquistas }) {
  const desbloqueadas = (conquistas || []).filter((c) => c.desbloqueada);
  if (desbloqueadas.length === 0) return null;

  return (
    <>
      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Conquistas</div>
      <div className="pl-conquistas">
        {desbloqueadas.map((c) => {
          const Icone = ICONE[c.id];
          return (
            <div key={c.id} className="pl-conquista desbloqueada" title={c.descricao}>
              <div className="pl-conquista-icone">{Icone && <Icone size={40} />}</div>
              <div className="pl-conquista-titulo">{c.titulo}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
