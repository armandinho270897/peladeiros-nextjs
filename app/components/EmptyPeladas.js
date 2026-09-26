import Link from 'next/link';

const TEXTOS = {
  geral: { marca: 'Bola parada.', titulo: 'Tá quieto por aqui', sub: 'Cria a pelada aí, paizão!' },
  filtro: { marca: 'Quase lá.', titulo: 'Nada com esses filtros', sub: 'Tenta outra data, um raio maior ou cria a pelada que tá faltando.' },
  minhas: { marca: 'No banco por ora.', titulo: 'Você ainda não tá em nenhuma', sub: 'Dá uma olhada nas peladas rolando e confirma presença.' },
};

function Ticket({ children }) {
  return (
    <>
      <span className="pl-ticket-label">{children}</span>
      <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
    </>
  );
}

// Estado vazio da aba Peladas: campo riscado a giz + bola parada no centro,
// sobre o mesmo gramado noturno do login (NightPitchBackground). Uma variante
// por situação (sem peladas / filtros sem resultado / "minhas" vazio).
export default function EmptyPeladas({ variante = 'geral', onLimparFiltros, onVerMapa, onVerPeladas, onPerto, onFimDeSemana, onSociety }) {
  const t = TEXTOS[variante] || TEXTOS.geral;

  return (
    <div className="pl-vazio">
      <svg className="pl-vazio-campo" viewBox="0 0 300 150" aria-hidden="true">
        <rect className="pl-vazio-giz" pathLength="1" x="12" y="14" width="276" height="122" rx="6" />
        <line className="pl-vazio-giz d2" pathLength="1" x1="150" y1="14" x2="150" y2="136" />
        <circle className="pl-vazio-giz d2" pathLength="1" cx="150" cy="75" r="22" />
        <rect className="pl-vazio-giz d3" pathLength="1" x="12" y="44" width="34" height="62" />
        <rect className="pl-vazio-giz d3" pathLength="1" x="254" y="44" width="34" height="62" />
        <rect className="pl-vazio-giz d3" pathLength="1" x="12" y="60" width="14" height="30" />
        <rect className="pl-vazio-giz d3" pathLength="1" x="274" y="60" width="14" height="30" />
        <g transform="translate(0,-25)">
          <ellipse className="pl-vazio-sombra" cx="150" cy="112" rx="11" ry="3" fill="rgba(0,0,0,.55)" />
          <g className="pl-vazio-bola">
            <circle cx="150" cy="100" r="10" fill="#F3F3EE" stroke="#161412" strokeWidth="1.2" />
            <polygon points="150,94.5 155,98.2 153.1,104 146.9,104 145,98.2" fill="#161412" />
          </g>
        </g>
      </svg>

      <span className="pl-vazio-marca">{t.marca}</span>
      <h3 className="pl-vazio-titulo">{t.titulo}</h3>
      <p className="pl-vazio-sub">{t.sub}</p>

      <div className="pl-vazio-acoes">
        {variante === 'minhas' ? (
          <button type="button" className="pl-ticket" onClick={onVerPeladas}><Ticket>Ver peladas</Ticket></button>
        ) : (
          <Link href="/?criar=1" className="pl-ticket" style={{ textDecoration: 'none' }}><Ticket>Criar pelada</Ticket></Link>
        )}
        {variante === 'geral' && (
          <button type="button" className="pl-vazio-link" onClick={onVerMapa}>Ver no mapa</button>
        )}
        {variante === 'filtro' && (
          <button type="button" className="pl-vazio-link" onClick={onLimparFiltros}>Limpar filtros</button>
        )}
      </div>

      {variante === 'geral' && (
        <div className="pl-vazio-dicas">
          <button type="button" className="pl-vazio-dica" onClick={onPerto}>📍 Perto</button>
          <button type="button" className="pl-vazio-dica" onClick={onFimDeSemana}>📅 Fim de semana</button>
          <button type="button" className="pl-vazio-dica" onClick={onSociety}>⚽ Society</button>
        </div>
      )}
    </div>
  );
}
