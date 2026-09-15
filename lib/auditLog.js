import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import * as Sentry from '@sentry/nextjs';

// Registra uma ação administrativa. Fire-and-forget, mesmo estilo de
// lib/notify.js (createNotification) — um log de auditoria que falha não
// pode derrubar a ação principal que ele está registrando; se der erro,
// reporta pro Sentry e segue.
export async function registrarAuditoria({ adminUserId, acao, alvoTipo, alvoId, motivo, dadosAntes, dadosDepois }) {
  const { error } = await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    acao,
    alvo_tipo: alvoTipo,
    alvo_id: alvoId != null ? String(alvoId) : null,
    motivo: motivo ?? null,
    dados_antes: dadosAntes ?? null,
    dados_depois: dadosDepois ?? null,
  });
  if (error) {
    console.error('registrarAuditoria falhou:', error.message);
    Sentry.captureException(new Error(`registrarAuditoria (${acao}) falhou: ${error.message}`));
  }
}
