'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import EscalacaoField from './EscalacaoField';
import PeladaChat from './PeladaChat';
import { souAprovadoDe } from '@/lib/gameUtils';

// Escalação e chat viviam empilhados na mesma página (scroll longo). Abas
// evitam isso e dão espaço de verdade pro campo tático e pro chat, cada um
// ocupando a tela cheia quando ativo.
//
// A aba inativa fica escondida com display:none em vez de desmontada — o
// chat abre canal Realtime + busca mensagens no mount; desmontar a cada
// troca de aba reabriria tudo (refetch, reconexão) toda vez que alguém
// alternasse entre Escalação e Chat.
export default function PeladaAbas({ game }) {
  const { user } = useAuth();
  const [aba, setAba] = useState('escalacao');

  const souAprovado = souAprovadoDe(game, user?.id);

  return (
    <div style={{ paddingTop: 4 }}>
      <div className="pl-abas-tabs">
        <button
          type="button"
          className={`pl-abas-tab ${aba === 'escalacao' ? 'active' : ''}`}
          onClick={() => setAba('escalacao')}
        >
          <span className="ico" aria-hidden="true">⚽</span> Escalação
        </button>
        <button
          type="button"
          className={`pl-abas-tab ${aba === 'chat' ? 'active' : ''} ${!souAprovado ? 'disabled' : ''}`}
          onClick={() => setAba('chat')}
          aria-disabled={!souAprovado}
        >
          Chat
        </button>
      </div>

      <div style={{ display: aba === 'escalacao' ? 'block' : 'none' }}>
        <EscalacaoField game={game} />
      </div>

      {souAprovado ? (
        <div style={{ display: aba === 'chat' ? 'block' : 'none' }}>
          <PeladaChat game={game} />
        </div>
      ) : (
        aba === 'chat' && (
          <div className="pl-abas-disabled-note">
            <p>O chat só é liberado pra quem já está confirmado nessa pelada. Confirma sua presença aí em cima pra participar.</p>
          </div>
        )
      )}
    </div>
  );
}
