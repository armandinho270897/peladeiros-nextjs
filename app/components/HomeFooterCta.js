'use client';
import Link from 'next/link';
import { fmtDate } from '@/lib/gameUtils';

// CTA único de rodapé — lembrete de uma linha se já tem pelada confirmada
// (o card completo já existe em /peladas, não duplica aqui), ou reforço
// grande de "Só falta você" quando não tem nenhuma.
export default function HomeFooterCta({ game, loading }) {
  if (loading) return <div className="pl-skeleton" style={{ height: 56, margin: '0 16px', borderRadius: 8 }} />;

  if (game) {
    const d = fmtDate(game.data);
    return (
      <Link href={`/pelada/${game.id}`} className="pl-footer-cta-line">
        <span className="pl-footer-cta-dot" aria-hidden="true" />
        <span className="pl-footer-cta-txt">{d.dow} · {game.horario} · <b>{game.local}</b></span>
        <span className="pl-footer-cta-arrow" aria-hidden="true">→</span>
      </Link>
    );
  }

  return (
    <div className="pl-footer-cta-empty">
      <p className="pl-footer-cta-headline">Só falta <span className="accent">você</span>.</p>
      <p className="pl-footer-cta-sub">Nenhuma pelada confirmada por enquanto.</p>
      <Link href="/peladas" className="pl-footer-cta-btn">Ver peladas</Link>
    </div>
  );
}
