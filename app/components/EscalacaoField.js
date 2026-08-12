'use client';
import { aprovadosDe } from '@/lib/gameUtils';
import Avatar from './Avatar';

const ZONAS = ['atacante', 'meio', 'zagueiro', 'goleiro'];
const ZONA_LABEL = { atacante: 'Ataque', meio: 'Meio', zagueiro: 'Zaga', goleiro: 'Gol' };

// Representação leve do time em campo, agrupando aprovados por posição.
// Só estético/identidade — não é um tático de verdade.
export default function EscalacaoField({ game }) {
  const aprovados = aprovadosDe(game);
  if (aprovados.length === 0) return null;

  const porZona = {};
  const reservas = [];
  for (const c of aprovados) {
    if (ZONAS.includes(c.posicao)) {
      (porZona[c.posicao] ||= []).push(c);
    } else {
      reservas.push(c);
    }
  }

  return (
    <div className="pl-escalacao">
      <div className="pl-escalacao-title">Escalação</div>
      <div className="pl-field-draw">
        {ZONAS.map((zona) => (
          <div key={zona} className="pl-field-zone">
            {(porZona[zona] || []).map((c) => (
              <div key={c.id} className="pl-field-player">
                <Avatar nome={c.nome} size={28} />
              </div>
            ))}
            {(porZona[zona] || []).length === 0 && (
              <span className="pl-field-zone-empty">{ZONA_LABEL[zona]}</span>
            )}
          </div>
        ))}
      </div>
      {reservas.length > 0 && (
        <div className="pl-field-reservas">
          <span className="pl-field-reservas-label">Reservas:</span>
          {reservas.map((c) => <Avatar key={c.id} nome={c.nome} size={24} />)}
        </div>
      )}
    </div>
  );
}
