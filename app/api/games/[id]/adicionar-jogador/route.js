import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Erro esperado (jogo sumiu / jogador não encontrado / já está na pelada)
// vem como exceção da função com essa mensagem exata; mapeia pro status certo.
const STATUS_POR_MENSAGEM = {
  'Pelada não encontrada.': 404,
  'Jogador não encontrado.': 404,
  'Esse jogador já está na pelada.': 409,
};

// Mesmo caminho de "adicionar jogador" usado na criação da pelada, só que
// aqui o capitão adiciona depois, na tela de gerenciar. A decisão de vaga
// (aprovado x espera) acontece toda dentro de adicionar_jogador_direto
// (supabase/migrations/058) — ela resolve a corrida de duas chamadas
// simultâneas contando a mesma vaga livre, igual aprovar_confirmacao já
// faz pro fluxo de solicitação.
export async function POST(request, { params }) {
  if (!(await checkRateLimit(`adicionar-jogador:${getClientIp(request)}`))) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { userId, nome: nomeConvidado, codigo } = await request.json().catch(() => ({}));
  if (!userId && !nomeConvidado?.trim()) return NextResponse.json({ error: 'Selecione um jogador ou digite um nome.' }, { status: 400 });

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: resultado, error } = await supabase
    .rpc('adicionar_jogador_direto', { p_game_id: id, p_user_id: userId || null, p_nome_convidado: nomeConvidado?.trim() || null })
    .single();

  if (error) {
    const status = STATUS_POR_MENSAGEM[error.message];
    if (status) return NextResponse.json({ error: error.message }, { status });
    return errJson(error, 500);
  }

  return NextResponse.json(resultado, { status: 201 });
}
