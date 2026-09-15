import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';
import { createNotification } from '@/lib/notify';

const STATUS_AVISAVEIS = ['aprovado', 'aguardando_confirmacao', 'espera'];

export async function POST(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { motivo } = await request.json().catch(() => ({}));
  if (!motivo?.trim()) return NextResponse.json({ error: 'Informe o motivo da pausa.' }, { status: 400 });

  const { data: game } = await supabase.from('games').select('local, owner_id, pausada_em').eq('id', params.id).maybeSingle();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const novoValor = game.pausada_em ? null : new Date().toISOString();
  const { error } = await supabase
    .from('games')
    .update({ pausada_em: novoValor, pausada_motivo: novoValor ? motivo.trim() : null })
    .eq('id', params.id);
  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: novoValor ? 'pelada_pausada' : 'pelada_despausada', alvoTipo: 'pelada', alvoId: params.id,
    motivo: motivo.trim(), dadosAntes: { pausada_em: game.pausada_em }, dadosDepois: { pausada_em: novoValor },
  });

  if (novoValor) {
    const { data: confirmacoes } = await supabase.from('confirmacoes').select('user_id, status').eq('game_id', params.id);
    const mensagem = `A pelada em ${game.local} foi pausada pela administração. Motivo: ${motivo.trim()}`;
    const avisados = new Set();
    for (const c of confirmacoes || []) {
      if (c.user_id && STATUS_AVISAVEIS.includes(c.status) && !avisados.has(c.user_id)) {
        avisados.add(c.user_id);
        await createNotification({ userId: c.user_id, tipo: 'pelada_pausada_admin', gameId: params.id, mensagem });
      }
    }
    if (game.owner_id && !avisados.has(game.owner_id)) {
      await createNotification({ userId: game.owner_id, tipo: 'pelada_pausada_admin', gameId: params.id, mensagem });
    }
  }

  return NextResponse.json({ ok: true, pausada: !!novoValor });
}
