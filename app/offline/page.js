'use client';
import SemSinalIcon from '../components/icons/SemSinalIcon';
import TicketButton from '../components/TicketButton';

// Sem dado de servidor de propósito — essa página precisa continuar
// funcionando quando não há internet nenhuma. O service worker
// (public/sw.js) serve ela do cache quando uma navegação falha por falta
// de rede; se o Next tentasse buscar algo aqui, cairia no mesmo problema
// que ela existe pra evitar.
export default function OfflinePage() {
  return (
    <div className="pl-empty">
      <SemSinalIcon />
      <h2 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--paper)', fontSize: 20, margin: '10px 0 4px' }}>
        Sem conexão
      </h2>
      <p style={{ maxWidth: 320, margin: '0 auto' }}>
        Não rolou agora — confere o sinal e tenta de novo. O que você já tinha aberto continua funcionando.
      </p>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
        <TicketButton onClick={() => window.location.reload()}>Tentar de novo</TicketButton>
      </div>
    </div>
  );
}
