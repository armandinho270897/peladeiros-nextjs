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

function agruparPorZona(jogadores) {
  const porZona = {};
  const reservas = [];
  for (const c of jogadores) {
    const posicaoPrincipal = c.posicoes?.[0];
    const zona = posicaoPrincipal ? CATEGORIA_PARA_ZONA[POSICAO_ZONA[posicaoPrincipal]] : null;
    if (zona) (porZona[zona] ||= []).push(c);
    else reservas.push(c);
  }
  return { porZona, reservas };
}

function JogadorChip({ c, compact }) {
  // Convidado sem conta (user_id null) não tem perfil pra ver.
  const Wrapper = c.user_id ? Link : 'div';
  const props = c.user_id ? { href: `/perfil/${c.user_id}`, style: { textDecoration: 'none' } } : {};
  return (
    <Wrapper {...props} className={compact ? 'pl-field-reserva-chip' : 'pl-field-player'}>
      <Avatar nome={c.nome} size={compact ? 24 : 36} fotoUrl={c.foto_url} />
      <span className={compact ? '' : 'pl-field-player-name'}>{c.nome}</span>
    </Wrapper>
  );
}

// Um "campo" (grade de 4 zonas + quem ficou de fora da grade) pra um grupo
// de jogadores — reaproveitado tanto pra escalação única (sem times
// montados, label/vazio originais "Reservas") quanto, quando o capitão já
// montou Time A/B (MontarTimesModal), uma vez pra cada time (label padrão
// "Sem posição definida", sem placeholder de vazio — não faz sentido dizer
// "sem reservas" pra cada time individualmente).
function CampoZonas({ jogadores, titulo, labelSemZona = 'Sem posição definida', vazioSemZona }) {
  const { porZona, reservas } = agruparPorZona(jogadores);
  return (
    <div>
      {titulo && <div className="pl-field-reservas-label" style={{ marginBottom: 6 }}>{titulo}</div>}
      <div className="pl-field-draw">
        {ZONAS.map((zona) => (
          <div key={zona} className="pl-field-zone-wrap">
            {(porZona[zona] || []).length > 0 && (
              <span className="pl-field-zone-label">{ZONA_LABEL[zona]}</span>
            )}
            <div className="pl-field-zone">
              {(porZona[zona] || []).map((c) => <JogadorChip key={c.id} c={c} />)}
              {(porZona[zona] || []).length === 0 && (
                <span className="pl-field-zone-empty">{ZONA_LABEL[zona]}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {(reservas.length > 0 || vazioSemZona) && (
        <div className="pl-field-reservas">
          <span className="pl-field-reservas-label">{labelSemZona}</span>
          {reservas.length > 0 ? (
            <div className="pl-field-reservas-chips">
              {reservas.map((c) => <JogadorChip key={c.id} c={c} compact />)}
            </div>
          ) : (
            <p className="pl-field-reservas-empty">{vazioSemZona}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Representação leve do time em campo, agrupando aprovados pela primeira
// posição escolhida no perfil (quem tem 2, a escalação usa só a
// principal). Só estético/identidade — não é um tático de verdade. Se o
// capitão já montou Time A/Time B (MontarTimesModal), mostra um campo pra
// cada time, empilhados, em vez do campo único de todo mundo junto.
export default function EscalacaoField({ game }) {
  const aprovados = aprovadosDe(game);
  if (aprovados.length === 0) return null;

  const temTimes = aprovados.some((c) => c.time === 'A' || c.time === 'B');

  if (temTimes) {
    const timeA = aprovados.filter((c) => c.time === 'A');
    const timeB = aprovados.filter((c) => c.time === 'B');
    const semTime = aprovados.filter((c) => c.time !== 'A' && c.time !== 'B');
    return (
      <div className="pl-escalacao">
        <div className="pl-escalacao-title">Escalação</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CampoZonas jogadores={timeA} titulo="Time A" />
          <CampoZonas jogadores={timeB} titulo="Time B" />
        </div>
        {semTime.length > 0 && (
          <div className="pl-field-reservas">
            <span className="pl-field-reservas-label">Ainda sem time definido</span>
            <div className="pl-field-reservas-chips">
              {semTime.map((c) => <JogadorChip key={c.id} c={c} compact />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pl-escalacao">
      <div className="pl-escalacao-title">Escalação</div>
      <CampoZonas jogadores={aprovados} labelSemZona="Reservas" vazioSemZona="Sem reservas no momento." />
    </div>
  );
}
