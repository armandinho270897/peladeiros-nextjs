import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';

// Contexto mínimo pra decidir sem vazar o autor publicamente — nome do
// autor e um rótulo legível do alvo (nome do jogador/local da pelada/nome
// da arena) só aparecem aqui, nunca numa rota pública.
async function comContexto(denuncias) {
  const autorIds = [...new Set(denuncias.map((d) => d.autor_id))];
  const { data: autores } = autorIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', autorIds)
    : { data: [] };
  const nomeAutorDe = Object.fromEntries((autores || []).map((p) => [p.id, p.nome]));

  const porTipo = { jogador: [], pelada: [], arena: [] };
  for (const d of denuncias) porTipo[d.alvo_tipo]?.push(d.alvo_id);

  const [{ data: jogadores }, { data: peladas }, { data: arenas }] = await Promise.all([
    porTipo.jogador.length ? supabase.from('profiles').select('id, nome').in('id', porTipo.jogador) : Promise.resolve({ data: [] }),
    porTipo.pelada.length ? supabase.from('games').select('id, local, bairro').in('id', porTipo.pelada) : Promise.resolve({ data: [] }),
    porTipo.arena.length ? supabase.from('arenas').select('id, nome').in('id', porTipo.arena) : Promise.resolve({ data: [] }),
  ]);
  const labelDe = {
    jogador: Object.fromEntries((jogadores || []).map((j) => [j.id, j.nome])),
    pelada: Object.fromEntries((peladas || []).map((p) => [p.id, `${p.local} (${p.bairro})`])),
    arena: Object.fromEntries((arenas || []).map((a) => [a.id, a.nome])),
  };

  return denuncias.map((d) => ({
    ...d,
    autor_nome: nomeAutorDe[d.autor_id] || 'Desconhecido',
    alvo_label: labelDe[d.alvo_tipo]?.[d.alvo_id] || 'Não encontrado (pode ter sido removido)',
  }));
}

export async function GET(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const alvoTipo = searchParams.get('alvoTipo');

  let query = supabase.from('denuncias').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  else query = query.in('status', ['aberta', 'em_analise']);
  if (alvoTipo) query = query.eq('alvo_tipo', alvoTipo);

  const { data, error } = await query;
  if (error) return errJson(error.message, 500);

  return NextResponse.json(await comContexto(data || []));
}
