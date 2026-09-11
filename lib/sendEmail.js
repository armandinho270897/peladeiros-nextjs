import nodemailer from 'nodemailer';

// Envio de e-mail transacional via SMTP do Gmail (senha de app, GMAIL_USER +
// GMAIL_APP_PASSWORD) — trocado do Resend porque a conta Resend tá em modo
// sandbox (só manda pro próprio e-mail dono da chave sem verificar um
// domínio, e verificar domínio custa ter domínio próprio). Gmail manda pra
// qualquer destinatário de graça, sem precisar de domínio, até ~500
// e-mails/dia — de sobra pro volume de hoje.
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

// Lança se falhar — quem chama decide o que fazer com isso. O login por
// e-mail (magic-link) PRECISA saber se falhou pra avisar o usuário; já
// notificação (lib/notify.js) é best-effort e engole o erro por conta
// própria, igual sempre foi.
export async function sendEmail({ to, subject, html }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER/GMAIL_APP_PASSWORD não configurados.');
  }
  if (!to) return;

  await getTransporter().sendMail({
    from: `Peladeiros <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
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
