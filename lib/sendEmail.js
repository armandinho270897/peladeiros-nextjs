// Envio de e-mail transacional via API HTTP do Resend — mesmo padrão (fetch
// direto, sem SDK, mesma RESEND_API_KEY/RESEND_FROM_EMAIL) já usado em
// app/api/auth/magic-link/route.js, extraído aqui pra ser reaproveitado
// pelas notificações urgentes (lib/notify.js). Nunca lança: e-mail é
// best-effort, igual notificação in-app — nunca pode derrubar a ação
// principal da rota que chamou.
export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return;

  const from = process.env.RESEND_FROM_EMAIL || 'Peladeiros <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('sendEmail falhou:', body.message || res.status);
    }
  } catch (err) {
    console.error('sendEmail erro:', err.message);
  }
}

// Mesmo miolo visual do e-mail de login (título + parágrafo + rodapé) —
// só o conteúdo muda por chamada.
export function emailTemplate(mensagem) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; color: #0A0A0A;">
      <h2 style="margin-bottom: 4px;">PELADEIROS</h2>
      <p style="color: #6E7178; margin-top: 0;">Vem pro fut, vem.</p>
      <p>${mensagem}</p>
      <p style="color: #6E7178; font-size: 13px; margin-top: 24px;">Você recebeu esse e-mail porque tem esse tipo de aviso ativado no Peladeiros. Pra desligar, vá em Configurações dentro do app.</p>
    </div>
  `;
}
