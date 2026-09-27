import EmptyState, { EmptyAcao, EmptyLink } from './EmptyState';

const TEXTOS = {
  geral: { marca: 'Fut tá parado.', titulo: 'Tá quieto por aqui', sub: 'Cria a pelada aí, paizão!' },
  filtro: { marca: 'Quase lá.', titulo: 'Nada com esses filtros', sub: 'Tenta outra data, um raio maior ou cria a pelada que tá faltando.' },
  minhas: { marca: 'Banco de reservas.', titulo: 'Você ainda não tá em nenhuma', sub: 'Dá uma olhada nas peladas rolando e confirma presença.' },
};

// Vazio da aba Peladas. Não repete atalhos de filtro nem "Ver no mapa":
// a aba já mostra os chips e o Lista/Mapa logo acima.
export default function EmptyPeladas({ variante = 'geral', onLimparFiltros, onVerPeladas }) {
  const t = TEXTOS[variante] || TEXTOS.geral;
  return (
    <EmptyState cena={variante === 'minhas' ? 'banco' : 'campo'} marca={t.marca} titulo={t.titulo} sub={t.sub}>
      {variante === 'minhas'
        ? <EmptyAcao onClick={onVerPeladas}>Ver peladas</EmptyAcao>
        : <EmptyAcao href="/?criar=1">Criar pelada</EmptyAcao>}
      {variante === 'filtro' && <EmptyLink onClick={onLimparFiltros}>Limpar filtros</EmptyLink>}
    </EmptyState>
  );
}
