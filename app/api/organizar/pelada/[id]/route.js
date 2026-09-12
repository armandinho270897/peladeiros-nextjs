import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { getSessionUser, authorizeOrganizerGame } from '@/lib/organizerAuth';
import { aprovadosDe, ocupandoVagaDe, esperaDe, pendentesDe, aguardandoConfirmacaoDe, jaAconteceu } from '@/lib/gameUtils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Visão operacional de UMA pelada organizada — status, ocupação,
// pagamento e as listas por status, pra gerenciar sem ficar pulando
// entre telas. Ações (aprovar, marcar pago, encerrar, editar, escalação)
// continuam nas rotas já existentes; essa aqui é só leitura.
export async function GET(request, { params }) {
  const user = await getSessionUser();
  const auth = await authorizeOrganizerGame(params.id, user);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('*, confirmacoes(*)').eq('id', params.id).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  // codigo (PIN) nunca sai daqui. whatsapp também não, EXCETO pra quem já
  // ocupa vaga de verdade (aprovado / aguardando_confirmacao) — é o único
  // caso em que o organizador legitimamente precisa falar com a pessoa pra
  // coordenar o jogo. Quem só pediu (pendente), está na espera, cancelou ou
  // faltou continua sem o contato exposto.
  const { codigo, confirmacoes, ...gameSafe } = game;
  const semContato = (confirmacoes || []).map(({ whatsapp, ...c }) => c);

  const aprovados = aprovadosDe(game);
  const ocupando = ocupandoVagaDe(game);
  const jaRolou = jaAconteceu(game) || !!game.encerrada_em;

  const resumoPagamento = game.valor ? {
    valor: game.valor,
    esperado: ocupando.length * game.valor,
    recebido: ocupando.filter((c) => c.pago).length * game.valor,
  } : null;

  return NextResponse.json({
    game: gameSafe,
    status: game.encerrada_em ? 'encerrada' : jaRolou ? 'aguardando_encerramento' : 'agendada',
    confirmados: aprovados,
    aguardandoConfirmacao: aguardandoConfirmacaoDe(game),
    pendentesAprovacao: pendentesDe(game).map(({ whatsapp, ...c }) => c),
    espera: esperaDe(game).map(({ whatsapp, ...c }) => c),
    cancelados: semContato.filter((c) => c.status === 'cancelado'),
    faltas: semContato.filter((c) => c.status === 'aprovado' && c.presente === false),
    resumoPagamento,
  });
}
