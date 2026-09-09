import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';

// Vincula um time a uma pelada: os membros aprovados do time entram DIRETO
// (aprovado, dentro da capacidade restante — mesmo critério que
// jogadoresIniciais já usa em POST /api/games; espera se estourar), sem
// passar pela fila de aprovação do capitão — é essa a vantagem real de
// fazer parte do time, que antes não existia (todo mundo virava só mais
// uma solicitação pendente igual um estranho).
export async function POST(request, { params }) {
  if (!checkRateLimit(`games:vincular-time:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { timeId, codigo } = await request.json().catch(() => ({}));
  if (!timeId) return NextResponse.json({ error: 'Selecione um time.' }, { status: 400 });

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('local, vagas_totais').eq('id', id).single();
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

  const { data: jaConfirmados } = await supabase.from('confirmacoes').select('user_id, status').eq('game_id', id);
  const idsExistentes = new Set((jaConfirmados || []).map((c) => c.user_id));
  let vagasRestantes = game.vagas_totais - (jaConfirmados || []).filter((c) => ['aprovado', 'aguardando_confirmacao'].includes(c.status)).length;

  let convidados = 0;
  let jaExistentes = 0;

  for (const p of perfis || []) {
    if (idsExistentes.has(p.id)) { jaExistentes++; continue; }

    const status = vagasRestantes > 0 ? 'aprovado' : 'espera';

    const { error } = await supabase
      .from('confirmacoes')
      .insert({ game_id: id, user_id: p.id, nome: p.nome, whatsapp: p.whatsapp, bairro: p.bairro, status });
    if (error) continue;

    if (status === 'aprovado') vagasRestantes--;
    convidados++;
    await createNotification({
      userId: p.id,
      tipo: 'convite_time_pelada',
      gameId: id,
      mensagem: status === 'aprovado'
        ? `Seu time ${time.nome} foi vinculado à pelada em ${game.local}. Você já está confirmado!`
        : `Seu time ${time.nome} foi vinculado à pelada em ${game.local}, mas sem vaga agora — você entrou no banco de reservas.`,
    });
  }

  return NextResponse.json({ convidados, jaExistentes });
}
