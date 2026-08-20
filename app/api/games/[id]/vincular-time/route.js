import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';

// Vincula um time a uma pelada: cria solicitação PENDENTE pra cada membro
// aprovado do time de uma vez (o capitão da pelada segue aprovando cada um
// normalmente, igual qualquer outra solicitação) — não entra direto aprovado.
export async function POST(request, { params }) {
  if (!checkRateLimit(`games:vincular-time:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { timeId, codigo } = await request.json().catch(() => ({}));
  if (!timeId) return NextResponse.json({ error: 'Selecione um time.' }, { status: 400 });

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('local').eq('id', id).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const { data: time } = await supabase.from('times').select('nome').eq('id', timeId).single();
  if (!time) return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });

  const { data: membrosRows } = await supabase.from('time_membros').select('user_id').eq('time_id', timeId).eq('status', 'aprovado');

  // profiles não tem FK direta com time_membros (ambos só referenciam
  // auth.users) — busca à parte e junta em JS, mesmo padrão do resto do app.
  const idsMembros = (membrosRows || []).map((m) => m.user_id);
  const { data: perfis } = idsMembros.length > 0
    ? await supabase.from('profiles').select('id, nome, whatsapp, bairro').in('id', idsMembros)
    : { data: [] };

  const { data: jaConfirmados } = await supabase.from('confirmacoes').select('user_id').eq('game_id', id);
  const idsExistentes = new Set((jaConfirmados || []).map((c) => c.user_id));

  let convidados = 0;
  let jaExistentes = 0;

  for (const p of perfis || []) {
    if (idsExistentes.has(p.id)) { jaExistentes++; continue; }

    const { error } = await supabase
      .from('confirmacoes')
      .insert({ game_id: id, user_id: p.id, nome: p.nome, whatsapp: p.whatsapp, bairro: p.bairro, status: 'pendente' });
    if (error) continue;

    convidados++;
    await createNotification({
      userId: p.id,
      tipo: 'convite_time_pelada',
      gameId: id,
      mensagem: `Seu time ${time.nome} foi vinculado à pelada em ${game.local}. Sua presença está pendente de aprovação do capitão.`,
    });
  }

  return NextResponse.json({ convidados, jaExistentes });
}
