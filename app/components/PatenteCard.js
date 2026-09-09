'use client';
import { useEffect, useState } from 'react';
import TrophyIcon from './TrophyIcon';

const CHAVE_PATENTE_VISTA = 'pl-patente-vista';

// Mesma lógica de "primeira vez roda, só semeia" que o antigo card de
// conquista recém-desbloqueada usava (localStorage com o último estado
// visto) — evita mostrar a celebração pra quem só acabou de logar num
// aparelho novo e já tinha, digamos, "Cria da Rua" há meses.
// `ativo=false` desliga a checagem inteira (não só a celebração visual) —
// necessário pra reaproveitar o card no perfil PÚBLICO de outra pessoa:
// sem isso, a chave de localStorage (global, não por-usuário-visitado)
// compararia a patente de quem você está vendo com a sua última vista,
// podendo disparar "Você virou X" com o nome de outra pessoa.
function usePatenteSubiu(nomeAtual, ativo) {
  const [subiu, setSubiu] = useState(false);
  useEffect(() => {
    if (!ativo || !nomeAtual) return;
    let vista;
    try { vista = localStorage.getItem(CHAVE_PATENTE_VISTA); } catch { vista = null; }
    if (vista === null) {
      try { localStorage.setItem(CHAVE_PATENTE_VISTA, nomeAtual); } catch {}
      return;
    }
    if (vista !== nomeAtual) {
      setSubiu(true);
      try { localStorage.setItem(CHAVE_PATENTE_VISTA, nomeAtual); } catch {}
    }
  }, [nomeAtual, ativo]);
  return subiu;
}

// Bloco 3 — patente atual + progresso até a próxima, com o selo "· Capitão"
// pra quem já desbloqueou "O Brabo que Comanda". Patente máxima (Lenda do
// Bairro) não tem próxima, então some a barra sem frase substituta.
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
