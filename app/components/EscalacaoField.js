'use client';
import Link from 'next/link';
import { aprovadosDe, POSICAO_ZONA } from '@/lib/gameUtils';
import Avatar from './Avatar';

// Zona ampla de exibição (agrupa as categorias de todas as modalidades em
// 4 baldes visuais) — "Meio-campo" cai em "meio", qualquer coisa de
// goleiro cai em "goleiro", etc.
const ZONAS = ['ataque', 'meio', 'defesa', 'goleiro'];
const ZONA_LABEL = { ataque: 'Ataque', meio: 'Meio', defesa: 'Zaga', goleiro: 'Gol' };
const CATEGORIA_PARA_ZONA = { Ataque: 'ataque', 'Meio-campo': 'meio', Defesa: 'defesa', Goleiro: 'goleiro' };

// Representação leve do time em campo, agrupando aprovados pela primeira
// posição escolhida no perfil (quem tem 2, a escalação usa só a
// principal). Só estético/identidade — não é um tático de verdade.
export default function EscalacaoField({ game }) {
  const aprovados = aprovadosDe(game);
  if (aprovados.length === 0) return null;

  const porZona = {};
  const reservas = [];
  for (const c of aprovados) {
    const posicaoPrincipal = c.posicoes?.[0];
    const zona = posicaoPrincipal ? CATEGORIA_PARA_ZONA[POSICAO_ZONA[posicaoPrincipal]] : null;
    if (zona) {
      (porZona[zona] ||= []).push(c);
    } else {
      reservas.push(c);
    }
  }

  return (
    <div className="pl-escalacao">
      <div className="pl-escalacao-title">Escalação</div>
      <div className="pl-field-draw">
        {ZONAS.map((zona) => (
          <div key={zona} className="pl-field-zone-wrap">
            {(porZona[zona] || []).length > 0 && (
              <span className="pl-field-zone-label">{ZONA_LABEL[zona]}</span>
            )}
            <div className="pl-field-zone">
              {(porZona[zona] || []).map((c) => {
                // Convidado sem conta (user_id null) não tem perfil pra ver.
                const Wrapper = c.user_id ? Link : 'div';
                const props = c.user_id ? { href: `/perfil/${c.user_id}`, style: { textDecoration: 'none' } } : {};
                return (
                  <Wrapper key={c.id} {...props} className="pl-field-player">
                    <Avatar nome={c.nome} size={36} fotoUrl={c.foto_url} />
                    <span className="pl-field-player-name">{c.nome}</span>
                  </Wrapper>
                );
              })}
              {(porZona[zona] || []).length === 0 && (
                <span className="pl-field-zone-empty">{ZONA_LABEL[zona]}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="pl-field-reservas">
        <span className="pl-field-reservas-label">Reservas</span>
        {reservas.length > 0 ? (
          <div className="pl-field-reservas-chips">
            {reservas.map((c) => {
              const Wrapper = c.user_id ? Link : 'div';
              const props = c.user_id ? { href: `/perfil/${c.user_id}`, style: { textDecoration: 'none' } } : {};
              return (
                <Wrapper key={c.id} {...props} className="pl-field-reserva-chip">
                  <Avatar nome={c.nome} size={24} fotoUrl={c.foto_url} />
                  <span>{c.nome}</span>
                </Wrapper>
              );
            })}
          </div>
        ) : (
          <p className="pl-field-reservas-empty">Sem reservas no momento.</p>
        )}
      </div>
    </div>
  );
}
