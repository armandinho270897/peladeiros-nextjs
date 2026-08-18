import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { attachNotaMedia } from '@/lib/ratings';
import { createNotification } from '@/lib/notify';
import { sweepExpiredConfirmacoes } from '@/lib/confirmacoesExpiry';

export async function GET() {
  await sweepExpiredConfirmacoes();

  const { data: games, error } = await supabase
    .from('games')
    .select('*, confirmacoes(*), arenas(nome, foto_url)')
    .order('data', { ascending: true })
    .order('horario', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // jogadores adicionados direto na criação entram como aprovado (dentro da
  // capacidade) ou espera (se estourar) — mesmo critério do fluxo de aprovar.
  // Convidados sem conta (só nome, sem id) entram do mesmo jeito, sem user_id.
  if (Array.isArray(jogadoresIniciais) && jogadoresIniciais.length > 0) {
    const idsRegistrados = [...new Set(jogadoresIniciais.map((j) => j.id).filter((id) => id && id !== user.id))];
    const { data: perfis } = idsRegistrados.length > 0
      ? await supabase.from('profiles').select('id, nome, whatsapp, bairro').in('id', idsRegistrados)
      : { data: [] };
    const perfilPorId = {};
    for (const p of perfis || []) perfilPorId[p.id] = p;

    // mantém a ordem escolhida na tela (importa pra decidir quem entra aprovado vs espera)
    const rows = [];
    let i = 0;
    for (const j of jogadoresIniciais) {
      if (j.id === user.id) continue;
      const status = i < vagasTotais ? 'aprovado' : 'espera';
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
