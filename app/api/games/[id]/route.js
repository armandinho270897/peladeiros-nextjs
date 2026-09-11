import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { attachNotaMedia } from '@/lib/ratings';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { sweepExpiredConfirmacoes, promoverEsperaComConfirmacao } from '@/lib/confirmacoesExpiry';
import { createNotification } from '@/lib/notify';
import { fmtDate } from '@/lib/gameUtils';
import { errJson } from '@/lib/apiError';

// Quem tem "pele no jogo" quando a pelada muda ou é cancelada — pendente
// fica de fora (o capitão ainda nem aprovou, não tem compromisso firmado).
const STATUS_AVISAVEIS = ['aprovado', 'aguardando_confirmacao', 'espera'];

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
  const { codigo, local, bairro, data, horario, vagasTotais, arenaId, tipo, nivel, valor, regras } = body;

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: antes } = await supabase.from('games').select('local, bairro, data, horario').eq('id', id).single();

  const { error } = await supabase
    .from('games')
    .update({
      local,
      bairro,
      data,
      horario,
      vagas_totais: vagasTotais,
      arena_id: arenaId || null,
      tipo: tipo || null,
      nivel: nivel || null,
      valor: valor || null,
      regras: regras || null,
    })
    .eq('id', id);

  if (error) return errJson(error.message, 500);

  // se vagas aumentaram, promove quem estiver na fila de espera
  const { data: confirmacoes } = await supabase
    .from('confirmacoes')
    .select('id, user_id, status')
    .eq('game_id', id);

  const ocupando = confirmacoes.filter(c => c.status === 'aprovado' || c.status === 'aguardando_confirmacao').length;
  const vagasLivres = vagasTotais - ocupando;

  if (vagasLivres > 0) {
    await promoverEsperaComConfirmacao(id, vagasLivres);
  }

  // Só avisa quando algo que muda o "onde/quando" de verdade muda — trocar
  // só tipo/nível/valor/regras não afeta quem já tá confirmado a ponto de
  // merecer um aviso urgente.
  const mudouLogistica = antes && (antes.local !== local || antes.bairro !== bairro || antes.data !== data || antes.horario !== horario);
  if (mudouLogistica) {
    const { dow, dom } = fmtDate(data);
    const mensagem = `A pelada em ${local} mudou — agora é ${dow} ${dom}, ${horario?.slice(0, 5)}, ${bairro}. Confere se ainda dá pra ir.`;
    for (const c of confirmacoes || []) {
      if (c.user_id && STATUS_AVISAVEIS.includes(c.status)) {
        await createNotification({ userId: c.user_id, tipo: 'pelada_alterada', gameId: id, mensagem });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const { codigo } = await request.json();

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('local').eq('id', id).single();
  const { data: confirmacoes } = await supabase.from('confirmacoes').select('user_id, status').eq('game_id', id);

  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) return errJson(error.message, 500);

  if (game) {
    const mensagem = `A pelada em ${game.local} foi cancelada pelo capitão.`;
    for (const c of confirmacoes || []) {
      if (c.user_id && STATUS_AVISAVEIS.includes(c.status)) {
        await createNotification({ userId: c.user_id, tipo: 'pelada_cancelada', gameId: null, mensagem });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
