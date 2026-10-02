'use client';
import { useState, useEffect } from 'react';

const CHAVE_PATENTE_VISTA = 'pl-patente-vista';

// Mesma lógica de "primeira vez roda, só semeia" que o antigo card de
// conquista recém-desbloqueada usava (localStorage com o último estado
// visto) — evita mostrar a celebração pra quem só acabou de logar num
// aparelho novo e já tinha, digamos, "Fraudinha" há meses.
// `ativo=false` desliga a checagem inteira (não só a celebração visual) —
// necessário pra reaproveitar em telas de OUTRA pessoa (perfil público):
// sem isso, a chave de localStorage (global, não por-usuário-visitado)
// compararia a patente de quem você está vendo com a sua última vista,
// podendo disparar "Você virou X" com o nome de outra pessoa.
export function usePatenteSubiu(nomeAtual, ativo) {
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
