import ConquistaAvaliacaoCincoIcon from './ConquistaAvaliacaoCincoIcon';
import ConquistaBraboQueComandaIcon from './ConquistaBraboQueComandaIcon';

const ICONE = {
  avaliacao_cinco: ConquistaAvaliacaoCincoIcon,
  brabo_que_comanda: ConquistaBraboQueComandaIcon,
};

export default function ConquistasBadges({ conquistas }) {
  if (!conquistas || conquistas.length === 0) return null;

  return (
    <div className="pl-conquistas">
      {conquistas.map((c) => {
        const Icone = ICONE[c.id];
        return (
          <div key={c.id} className={`pl-conquista ${c.desbloqueada ? 'desbloqueada' : ''}`} title={c.descricao}>
            <div className="pl-conquista-icone">{Icone && <Icone size={40} />}</div>
            <div className="pl-conquista-titulo">{c.titulo}</div>
          </div>
        );
      })}
    </div>
  );
}
