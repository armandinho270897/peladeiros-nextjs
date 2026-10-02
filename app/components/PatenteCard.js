'use client';
import TrophyIcon from './icons/TrophyIcon';
import { usePatenteSubiu } from '@/lib/usePatenteSubiu';

// Bloco 3 — patente atual + progresso até a próxima, com o selo "· Capitão"
// pra quem já desbloqueou "O Brabo que Comanda". Patente máxima (Bradock
// Peladeiros) não tem próxima, então some a barra sem frase substituta.
// Só mostra a patente atual (e, no máximo, o nome da próxima na barra de
// progresso) — nunca a lista completa das 6.
// `celebrar=false` no perfil de outra pessoa (ver usePatenteSubiu acima).
export default function PatenteCard({ patente, celebrar = true }) {
  const subiu = usePatenteSubiu(patente?.nome, celebrar);
  if (!patente) return null;

  const { nome, capitao, proximaPatente } = patente;

  return (
    <>
      {subiu && (
        <div className="pl-glass-card pl-glass-unlocked pl-patente-celebrate pl-reveal pl-reveal-3">
          <span className="pl-glass-icon"><TrophyIcon size={20} /></span>
          <div className="pl-glass-body">
            <p className="pl-glass-msg">Você virou <b>{nome}</b>.</p>
          </div>
        </div>
      )}
      <div className="pl-glass-card pl-patente-card pl-reveal pl-reveal-3">
        <p className="pl-patente-name">
          {nome}
          {capitao && <span className="pl-patente-capitao">· Capitão</span>}
        </p>
        {proximaPatente && (
          <>
            <div className="pl-progress-track">
              <div
                className="pl-progress-fill"
                style={{ width: `${Math.min(100, Math.round((proximaPatente.atual / proximaPatente.meta) * 100))}%` }}
              />
            </div>
            <p className="pl-patente-progress-note">Faltam {proximaPatente.meta - proximaPatente.atual} peladas pra virar {proximaPatente.nome}</p>
          </>
        )}
      </div>
    </>
  );
}
