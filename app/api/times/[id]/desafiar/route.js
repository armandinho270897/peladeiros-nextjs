import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

// `id` (params) é o time DESAFIADO — quem chama propõe com um dos times
// que capitaneia (timeDesafianteId no corpo), já com data/local prontos.
export async function POST(request, { params }) {
  if (!checkRateLimit(`times:desafiar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id: timeDesafiadoId } = params;
  const { timeDesafianteId, local, bairro, latitude, longitude, arenaId, data, horario, mensagem } = await request.json().catch(() => ({}));

  if (!timeDesafianteId) return NextResponse.json({ error: 'Selecione com qual time você vai desafiar.' }, { status: 400 });
  if (!local || !bairro || !data || !horario) return NextResponse.json({ error: 'Preenche local, data e horário do desafio.' }, { status: 400 });
  if (timeDesafianteId === timeDesafiadoId) return NextResponse.json({ error: 'Um time não pode desafiar ele mesmo.' }, { status: 400 });

  const auth = await authorizeTimeCaptain(timeDesafianteId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: timeDesafiado } = await supabase.from('times').select('nome, aceita_desafios').eq('id', timeDesafiadoId).maybeSingle();
  if (!timeDesafiado) return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });
  if (!timeDesafiado.aceita_desafios) return NextResponse.json({ error: 'Esse time não está aceitando desafios agora.' }, { status: 400 });

  const { data: timeDesafiante } = await supabase.from('times').select('nome').eq('id', timeDesafianteId).maybeSingle();
  if (!timeDesafiante) return NextResponse.json({ error: 'Time desafiante não encontrado.' }, { status: 404 });

  const { data: existente } = await supabase
    .from('desafios')
    .select('id')
    .eq('status', 'pendente')
    .or(`and(time_desafiante_id.eq.${timeDesafianteId},time_desafiado_id.eq.${timeDesafiadoId}),and(time_desafiante_id.eq.${timeDesafiadoId},time_desafiado_id.eq.${timeDesafianteId})`)
    .maybeSingle();
  if (existente) return NextResponse.json({ error: 'Já existe um desafio pendente entre esses dois times.' }, { status: 409 });

  const { data: desafio, error } = await supabase
    .from('desafios')
    .insert({
      time_desafiante_id: timeDesafianteId,
      time_desafiado_id: timeDesafiadoId,
      proposto_por: auth.user.id,
      local,
      bairro,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      arena_id: arenaId || null,
      data,
      horario,
      mensagem: mensagem?.trim() || null,
    })
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  const { data: capitaesDesafiado } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', timeDesafiadoId)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');

  for (const c of capitaesDesafiado || []) {
    await createNotification({
      userId: c.user_id,
      tipo: 'desafio_recebido',
      mensagem: `${timeDesafiante.nome} desafiou seu time ${timeDesafiado.nome} pra um confronto em ${local}, ${data} às ${horario}.`,
      atorUserId: auth.user.id,
    });
  }

  return NextResponse.json(desafio, { status: 201 });
}
