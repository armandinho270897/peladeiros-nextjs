import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeChatParticipante } from '@/lib/chatAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';
import { LIMITE_MENSAGEM_CHAT as LIMITE_CARACTERES } from '@/lib/chatUtils';

export async function POST(request, { params }) {
  const { id } = params;

  const auth = await authorizeChatParticipante(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // por usuário, não por IP — várias pessoas do mesmo Wi-Fi conversando na
  // mesma pelada não podem se atrapalhar.
  if (!checkRateLimit(`pelada-chat:${auth.user.id}`, 15, 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas mensagens em pouco tempo. Espera um pouco.' }, { status: 429 });
  }

  const { texto } = await request.json().catch(() => ({}));
  const limpo = texto?.trim().slice(0, LIMITE_CARACTERES);
  if (!limpo) return NextResponse.json({ error: 'Escreve alguma coisa antes de enviar.' }, { status: 400 });

  const { data: mensagem, error } = await supabase
    .from('pelada_mensagens')
    .insert({ game_id: id, user_id: auth.user.id, texto: limpo })
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  const [{ data: profile }, { data: participantes }] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', auth.user.id).maybeSingle(),
    supabase.from('confirmacoes').select('user_id').eq('game_id', id).eq('status', 'aprovado').neq('user_id', auth.user.id),
  ]);

  const destinatarios = [...new Set((participantes || []).map((p) => p.user_id).filter(Boolean))];

  // Não empilha um aviso por mensagem — se a pessoa já tem um aviso desse
  // chat sem ler, uma mensagem nova não gera outro (evita spam quando o
  // papo engata); só quando ela lê o aviso anterior é que o próximo abre
  // um novo. Mesmo bom senso do poll de 15s do PeladaClient: notificar sem
  // inundar.
  const { data: jaNotificados } = destinatarios.length
    ? await supabase.from('notificacoes').select('user_id').in('user_id', destinatarios).eq('tipo', 'pelada_chat').eq('game_id', id).eq('lida', false)
    : { data: [] };
  const jaNotificadosSet = new Set((jaNotificados || []).map((n) => n.user_id));

  for (const userId of destinatarios) {
    if (jaNotificadosSet.has(userId)) continue;

    await createNotification({
      userId,
      tipo: 'pelada_chat',
      gameId: id,
      mensagem: `${profile?.nome || 'Alguém'} mandou mensagem no chat da pelada em ${auth.game.local}.`,
      atorUserId: auth.user.id,
    });
  }

  return NextResponse.json(mensagem, { status: 201 });
}
