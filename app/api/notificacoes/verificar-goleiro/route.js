import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';
import { inicioDoJogo, POSICAO_ZONA } from '@/lib/gameUtils';

const JANELA_MS = 12 * 60 * 60 * 1000; // avisa quando faltam 12h ou menos
// Deriva do mapa compartilhado de posições em vez de listar de novo aqui —
// qualquer slug cuja zona seja "Goleiro" conta, em qualquer modalidade.
const POSICOES_GOLEIRO = Object.keys(POSICAO_ZONA).filter((p) => POSICAO_ZONA[p] === 'Goleiro');

// Chamada quando o app abre (mesmo padrão de verificar-proximas): olha as
// peladas em que o usuário é capitão, acontecendo nas próximas 12h, e avisa
// se nenhum confirmado tem goleiro/goleiro-linha entre as posições do
// perfil. Sinal, não certeza — quem não preencheu posição no perfil não
// entra na conta, então o aviso pode disparar mesmo com goleiro de verdade
// confirmado; aceitável pro que é (lembrete, não bloqueio).
export async function POST() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  if (!checkRateLimit(`verificar-goleiro:${user.id}`)) {
    return NextResponse.json({ ok: true, criadas: 0 });
  }

  const { data: meuPerfil } = await supabase.from('profiles').select('notif_prefs').eq('id', user.id).maybeSingle();
  if (meuPerfil?.notif_prefs?.goleiro_faltando === false) {
    return NextResponse.json({ ok: true, criadas: 0 });
  }

  const { data: peladas } = await supabase
    .from('games')
    .select('id, local, data, horario')
    .eq('owner_id', user.id)
    .is('encerrada_em', null);

  const agora = Date.now();
  const candidatas = (peladas || []).filter((g) => {
    if (!g.data || !g.horario) return false;
    const diff = inicioDoJogo(g).getTime() - agora;
    return diff >= 0 && diff < JANELA_MS;
  });

  if (candidatas.length === 0) return NextResponse.json({ ok: true, criadas: 0 });

  const { data: jaNotificado } = await supabase
    .from('notificacoes')
    .select('game_id')
    .eq('user_id', user.id)
    .eq('tipo', 'goleiro_faltando')
    .in('game_id', candidatas.map((g) => g.id));
  const jaNotificadoSet = new Set((jaNotificado || []).map((n) => n.game_id));
  const faltandoChecar = candidatas.filter((g) => !jaNotificadoSet.has(g.id));

  if (faltandoChecar.length === 0) return NextResponse.json({ ok: true, criadas: 0 });

  const { data: confirmados } = await supabase
    .from('confirmacoes')
    .select('game_id, user_id')
    .eq('status', 'aprovado')
    .in('game_id', faltandoChecar.map((g) => g.id));

  const idsConfirmados = [...new Set((confirmados || []).map((c) => c.user_id).filter(Boolean))];
  const { data: perfis } = idsConfirmados.length
    ? await supabase.from('profiles').select('id, posicoes').in('id', idsConfirmados)
    : { data: [] };
  const posicoesPorId = Object.fromEntries((perfis || []).map((p) => [p.id, p.posicoes || []]));

  let criadas = 0;
  for (const g of faltandoChecar) {
    const confirmadosDoJogo = (confirmados || []).filter((c) => c.game_id === g.id);
    const temGoleiro = confirmadosDoJogo.some((c) =>
      (posicoesPorId[c.user_id] || []).some((p) => POSICOES_GOLEIRO.includes(p))
    );
    if (temGoleiro) continue;

    const { error } = await supabase.from('notificacoes').insert({
      user_id: user.id,
      tipo: 'goleiro_faltando',
      game_id: g.id,
      mensagem: `Procura-se uma parede! Faltam ${Math.round((inicioDoJogo(g).getTime() - agora) / 3600000)}h pro jogo em ${g.local} e ainda ninguém confirmou no gol.`,
    });
    if (error && error.code !== '23505') return errJson(error.message, 500);
    if (!error) criadas++;
  }

  return NextResponse.json({ ok: true, criadas });
}
