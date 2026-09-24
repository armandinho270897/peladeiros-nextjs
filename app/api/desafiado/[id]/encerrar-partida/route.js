import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeDesafiadoCriador } from '@/lib/desafiadoAuth';

// Toda a resolução (fechar a partida, atualizar vitórias/derrotas/gols
// dos dois times, achar o próximo da fila, criar a próxima partida) roda
// dentro da função desafiado_encerrar_partida (supabase/migrations/055),
// numa transação só — ou tudo acontece, ou nada acontece. `tipo` no
// retorno é só o roteamento pro formato de resposta certo.
export async function POST(request, { params }) {
  const { id } = params;
  const auth = await authorizeDesafiadoCriador(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { criterioDesempate, vencedorPenaltisTimeId } = await request.json().catch(() => ({}));

  const { data: resultado, error } = await supabase
    .rpc('desafiado_encerrar_partida', {
      p_sessao_id: id,
      p_criterio_desempate: criterioDesempate ?? null,
      p_vencedor_penaltis_time_id: vencedorPenaltisTimeId ?? null,
    })
    .single();

  if (error) return errJson(error.message, 500);

  switch (resultado.tipo) {
    case 'erro':
      return NextResponse.json({ error: resultado.mensagem }, { status: 400 });
    case 'empate_sem_criterio':
      return NextResponse.json({ error: resultado.mensagem, empatado: true }, { status: 409 });
    case 'empate_penaltis_sem_vencedor':
      return NextResponse.json({ error: resultado.mensagem, empatado: true, criterioDesempate: 'penaltis' }, { status: 409 });
    case 'prorrogacao':
      return NextResponse.json({ prorrogacao: true });
    case 'resolvida': {
      const coinFlip = resultado.cara_resultado
        ? { timeCaraId: resultado.cara_time_cara_id, timeCoroaId: resultado.cara_time_coroa_id, resultado: resultado.cara_resultado }
        : null;
      return NextResponse.json({
        vencedorTimeId: resultado.vencedor_time_id,
        perdedorTimeId: resultado.perdedor_time_id,
        proximaPartida: resultado.proxima_partida_id ? { id: resultado.proxima_partida_id } : null,
        coinFlip,
      });
    }
    default:
      return errJson('Resultado inesperado da função de encerrar partida.', 500);
  }
}
