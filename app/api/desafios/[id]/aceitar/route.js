import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';
import { inicioDoJogo } from '@/lib/gameUtils';

// Aceitar um desafio cria a pelada na hora, com os membros aprovados dos
// dois times já confirmados (não pendentes) — reaproveita 100% da
// infraestrutura de pelada que já existe (chat, encerrar, avaliar).
export async function POST(request, { params }) {
  if (!checkRateLimit(`desafios:aceitar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;

  const { data: desafio } = await supabase.from('desafios').select('*').eq('id', id).maybeSingle();
  if (!desafio) return NextResponse.json({ error: 'Desafio não encontrado.' }, { status: 404 });
  if (desafio.status !== 'pendente') return NextResponse.json({ error: 'Esse desafio já foi respondido.' }, { status: 409 });

  const auth = await authorizeTimeCaptain(desafio.time_desafiado_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (desafio.data && desafio.horario && inicioDoJogo(desafio).getTime() < Date.now()) {
    return NextResponse.json({ error: 'A data desse desafio já passou. Peça pro outro time propor uma nova.' }, { status: 409 });
  }

  // Só uma requisição consegue virar o desafio de pendente pra aceito — sem
  // isso, dois cliques (ou dois capitães) criavam duas peladas.
  const { data: reivindicado } = await supabase
    .from('desafios')
    .update({ status: 'aceito', respondido_em: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pendente')
    .select('id')
    .maybeSingle();
  if (!reivindicado) return NextResponse.json({ error: 'Esse desafio já foi respondido.' }, { status: 409 });

  const desfazer = () => supabase.from('desafios').update({ status: 'pendente', respondido_em: null, game_id: null }).eq('id', id);

  const [{ data: profile }, { data: timeDesafiante }, { data: timeDesafiado }] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', auth.user.id).maybeSingle(),
    supabase.from('times').select('nome').eq('id', desafio.time_desafiante_id).single(),
    supabase.from('times').select('nome').eq('id', desafio.time_desafiado_id).single(),
  ]);

  const { data: membrosRows } = await supabase
    .from('time_membros')
    .select('user_id, time_id')
    .in('time_id', [desafio.time_desafiante_id, desafio.time_desafiado_id])
    .eq('status', 'aprovado');

  const idsMembros = [...new Set((membrosRows || []).map((m) => m.user_id))];
  const { data: perfis } = idsMembros.length > 0
    ? await supabase.from('profiles').select('id, nome, whatsapp, bairro').in('id', idsMembros)
    : { data: [] };
  const perfilPorId = Object.fromEntries((perfis || []).map((p) => [p.id, p]));

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      local: desafio.local,
      bairro: desafio.bairro,
      data: desafio.data,
      horario: desafio.horario,
      vagas_totais: Math.max(idsMembros.length, 2),
      capitao: profile?.nome || 'Capitão',
      owner_id: auth.user.id,
      latitude: desafio.latitude,
      longitude: desafio.longitude,
      arena_id: desafio.arena_id,
      tipo: null,
      nivel: null,
      valor: null,
      regras: `Confronto: ${timeDesafiante?.nome || 'Time'} x ${timeDesafiado?.nome || 'Time'}`,
    })
    .select()
    .single();

  if (gameError) {
    await desfazer();
    return errJson(gameError.message, 500);
  }

  const confirmacoesRows = idsMembros
    .map((uid) => perfilPorId[uid])
    .filter(Boolean)
    .map((p) => ({ game_id: game.id, user_id: p.id, nome: p.nome, whatsapp: p.whatsapp, bairro: p.bairro, status: 'aprovado' }));
  if (confirmacoesRows.length > 0) {
    const { error: confError } = await supabase.from('confirmacoes').insert(confirmacoesRows);
    if (confError) {
      await supabase.from('games').delete().eq('id', game.id);
      await desfazer();
      return errJson(confError.message, 500);
    }
  }

  const { error: updateError } = await supabase.from('desafios').update({ game_id: game.id }).eq('id', id);
  if (updateError) Sentry.captureException(new Error(`desafios/aceitar update falhou: ${updateError.message}`));

  const { data: capitaesDesafiante } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', desafio.time_desafiante_id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');

  for (const c of capitaesDesafiante || []) {
    await createNotification({
      userId: c.user_id,
      tipo: 'desafio_aceito',
      gameId: game.id,
      mensagem: `${timeDesafiado?.nome || 'O time'} aceitou o desafio! Partida marcada em ${desafio.local}, ${desafio.data} às ${desafio.horario}.`,
      atorUserId: auth.user.id,
    });
  }

  return NextResponse.json({ desafio: { ...desafio, status: 'aceito', game_id: game.id }, gameId: game.id });
}
