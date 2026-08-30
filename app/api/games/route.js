import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { attachNotaMedia } from '@/lib/ratings';
import { createNotification } from '@/lib/notify';
import { sweepExpiredConfirmacoes } from '@/lib/confirmacoesExpiry';
import { errJson } from '@/lib/apiError';

export async function GET() {
  await sweepExpiredConfirmacoes();

  const { data: games, error } = await supabase
    .from('games')
    .select('*, confirmacoes(*), arenas(nome, foto_url)')
    .order('data', { ascending: true })
    .order('horario', { ascending: true });

  if (error) return errJson(error.message, 500);

  const comNotas = await attachNotaMedia(games);
  // não devolve o código (PIN) pro front — só é usado server-side pra validar edição
  const safe = comNotas.map(({ codigo, ...g }) => g);
  return NextResponse.json(safe);
}

export async function POST(request) {
  if (!checkRateLimit(`games:create:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas peladas criadas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra criar uma pelada.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('nome, whatsapp, bairro').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil antes de criar uma pelada.' }, { status: 400 });

  const body = await request.json();
  const { local, bairro, data, horario, vagasTotais, latitude, longitude, arenaId, jogadoresIniciais, tipo, nivel, valor, regras } = body;

  if (!local || !bairro || !data || !horario || !vagasTotais) {
    return NextResponse.json({ error: 'Dados inválidos. Confere se preencheu tudo.' }, { status: 400 });
  }

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      local, bairro, data, horario, vagas_totais: vagasTotais,
      capitao: profile.nome,
      owner_id: user.id,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      arena_id: arenaId ?? null,
      tipo: tipo ?? null,
      nivel: nivel ?? null,
      valor: valor ?? null,
      regras: regras ?? null,
    })
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  const idsRegistrados = Array.isArray(jogadoresIniciais)
    ? [...new Set(jogadoresIniciais.map((j) => j.id).filter((id) => id && id !== user.id))]
    : [];

  // O capitão sempre entra confirmado na própria pelada, sem passar pelo
  // fluxo de solicitação/aprovação (ele não vai aprovar a presença dele
  // mesmo) — ocupa uma vaga de vagas_totais como qualquer outro jogador.
  // Roda junto com a busca de perfis dos jogadoresIniciais (não há
  // dependência entre as duas). Reaplicado em 2026-08-30 depois de um
  // revert anterior (commit 52ab221) sem registro do motivo — se esse
  // insert voltar a causar problema, a suspeita nº 1 é o -1 na conta de
  // vagas logo abaixo, não este insert em si.
  const [{ error: confirmacaoCapitaoError }, { data: perfis }] = await Promise.all([
    supabase.from('confirmacoes').insert({
      game_id: game.id, user_id: user.id, nome: profile.nome, whatsapp: profile.whatsapp, bairro: profile.bairro, status: 'aprovado',
    }),
    idsRegistrados.length > 0
      ? supabase.from('profiles').select('id, nome, whatsapp, bairro').in('id', idsRegistrados)
      : Promise.resolve({ data: [] }),
  ]);
  if (confirmacaoCapitaoError) Sentry.captureException(new Error(`confirmação do capitão falhou: ${confirmacaoCapitaoError.message}`));

  // jogadores adicionados direto na criação entram como aprovado (dentro da
  // capacidade) ou espera (se estourar) — mesmo critério do fluxo de aprovar.
  // Convidados sem conta (só nome, sem id) entram do mesmo jeito, sem user_id.
  // Uma vaga já é do capitão, então a capacidade restante pra eles é vagasTotais - 1.
  if (Array.isArray(jogadoresIniciais) && jogadoresIniciais.length > 0) {
    const perfilPorId = {};
    for (const p of perfis || []) perfilPorId[p.id] = p;

    // mantém a ordem escolhida na tela (importa pra decidir quem entra aprovado vs espera)
    const rows = [];
    let i = 0;
    for (const j of jogadoresIniciais) {
      if (j.id === user.id) continue;
      const status = i < vagasTotais - 1 ? 'aprovado' : 'espera';
      if (j.id) {
        const p = perfilPorId[j.id];
        if (!p) continue;
        rows.push({ game_id: game.id, user_id: p.id, nome: p.nome, whatsapp: p.whatsapp, bairro: p.bairro, status });
      } else if (j.nome?.trim()) {
        rows.push({ game_id: game.id, user_id: null, nome: j.nome.trim(), whatsapp: '', bairro: null, status });
      } else {
        continue;
      }
      i++;
    }
    if (rows.length > 0) await supabase.from('confirmacoes').insert(rows);
  }

  // avisa quem tem o mesmo bairro no perfil que tem pelada nova por perto
  const { data: vizinhos } = await supabase.from('profiles').select('id').eq('bairro', bairro).neq('id', user.id);
  for (const v of vizinhos || []) {
    await createNotification({
      userId: v.id,
      tipo: 'pelada_nova_perto',
      gameId: game.id,
      mensagem: `Pelada nova em ${bairro}: ${local}, ${data} às ${horario}.`,
    });
  }

  const { codigo: _omit, ...safe } = game;
  return NextResponse.json(safe, { status: 201 });
}
