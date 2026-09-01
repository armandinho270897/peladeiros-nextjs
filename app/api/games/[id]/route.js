import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { attachNotaMedia } from '@/lib/ratings';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { sweepExpiredConfirmacoes, promoverEsperaComConfirmacao } from '@/lib/confirmacoesExpiry';
import { errJson } from '@/lib/apiError';

// Bug real encontrado em produção num endpoint irmão (/api/games/mapa):
// mesmo sem cookies/params (candidato a otimização estática) e mesmo com
// force-dynamic sozinho, o Data Cache do Next pra chamadas fetch (usadas
// pelo supabase-js por baixo) pode servir uma resposta cacheada antiga
// entre deploys. force-no-store garante que cada request bate no banco de
// verdade. Essa rota tem o mesmo formato de risco (supabaseAdmin, sem
// leitura de cookie no GET), por isso o mesmo par de diretivas aqui.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request, { params }) {
  await sweepExpiredConfirmacoes();

  const { id } = params;
  const { data: game, error } = await supabase
    .from('games')
    .select('*, confirmacoes(*)')
    .eq('id', id)
    .single();

  if (error || !game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const [comNotas] = await attachNotaMedia([game]);
  const { codigo, ...safe } = comNotas;
  return NextResponse.json(safe);
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { codigo, local, bairro, data, horario, vagasTotais } = body;

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase
    .from('games')
    .update({ local, bairro, data, horario, vagas_totais: vagasTotais })
    .eq('id', id);

  if (error) return errJson(error.message, 500);

  // se vagas aumentaram, promove quem estiver na fila de espera
  const { data: confirmacoes } = await supabase
    .from('confirmacoes')
    .select('id, status')
    .eq('game_id', id);

  const ocupando = confirmacoes.filter(c => c.status === 'aprovado' || c.status === 'aguardando_confirmacao').length;
  const vagasLivres = vagasTotais - ocupando;

  if (vagasLivres > 0) {
    await promoverEsperaComConfirmacao(id, vagasLivres);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const { codigo } = await request.json();

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true });
}
