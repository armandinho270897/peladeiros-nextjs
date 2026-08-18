import ConquistaPrimeiraPeladaIcon from './ConquistaPrimeiraPeladaIcon';
import ConquistaCincoPeladasIcon from './ConquistaCincoPeladasIcon';
import ConquistaDezPeladasIcon from './ConquistaDezPeladasIcon';
import ConquistaAvaliacaoCincoIcon from './ConquistaAvaliacaoCincoIcon';
import ConquistaBraboQueComandaIcon from './ConquistaBraboQueComandaIcon';

const ICONE = {
  primeira_pelada: ConquistaPrimeiraPeladaIcon,
  cinco_peladas: ConquistaCincoPeladasIcon,
  dez_peladas: ConquistaDezPeladasIcon,
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
            <div className="pl-conquista-icone">{Icone ? <Icone size={40} /> : '🏅'}</div>
            <div className="pl-conquista-titulo">{c.titulo}</div>
          </div>
        );
      })}
    </div>
  );
}
