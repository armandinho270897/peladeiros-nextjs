import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';
import { createNotification } from '@/lib/notify';
import { ADMIN_USER_ID } from '@/lib/adminConfig';

const ACOES = {
  advertir: { status: 'advertido', tipo: 'conta_advertida' },
  suspender: { status: 'suspenso', tipo: 'conta_suspensa' },
  reativar: { status: 'ativo', tipo: 'conta_reativada' },
  bloquear: { status: 'bloqueado', tipo: 'conta_bloqueada' },
};

// Toda ação exige motivo e fica registrada em admin_audit_log. Suspender
// aceita diasSuspensao opcional (senão fica sem prazo definido, precisa de
// reativação manual). Nenhum histórico é apagado — só o campo status muda.
export async function POST(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { acao, motivo, diasSuspensao } = await request.json().catch(() => ({}));
  const config = ACOES[acao];
  if (!config) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  if (!motivo?.trim()) return NextResponse.json({ error: 'Informe o motivo.' }, { status: 400 });
  if (params.id === auth.user.id || params.id === ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Essa conta não pode ser moderada por aqui.' }, { status: 403 });
  }
  const dias = diasSuspensao ? Number(diasSuspensao) : null;
  if (acao === 'suspender' && dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > 3650)) {
    return NextResponse.json({ error: 'Dias de suspensão inválido — use um número inteiro de 1 a 3650.' }, { status: 400 });
  }

  const { data: antes } = await supabase.from('profiles').select('status, suspenso_ate, moderacao_motivo').eq('id', params.id).maybeSingle();
  if (!antes) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

  const suspensoAte = acao === 'suspender' && dias
    ? new Date(Date.now() + dias * 24 * 3600 * 1000).toISOString()
    : null;

  const depois = {
    status: config.status,
    suspenso_ate: suspensoAte,
    moderacao_motivo: motivo.trim(),
    moderacao_atualizado_em: new Date().toISOString(),
  };

  const { data: profile, error } = await supabase.from('profiles').update(depois).eq('id', params.id).select().single();
  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: `usuario_${acao}`, alvoTipo: 'usuario', alvoId: params.id, motivo: motivo.trim(),
    dadosAntes: antes, dadosDepois: depois,
  });

  const mensagem = suspensoAte
    ? `Sua conta foi suspensa até ${new Date(suspensoAte).toLocaleDateString('pt-BR')}. Motivo: ${motivo.trim()}`
    : `Motivo: ${motivo.trim()}`;
  await createNotification({ userId: params.id, tipo: config.tipo, mensagem });

  return NextResponse.json(profile);
}
