'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { jaAconteceu as jaAconteceuDe, souAprovadoDe } from '@/lib/gameUtils';
import { LIMITE_MENSAGEM_CHAT as LIMITE_CARACTERES } from '@/lib/chatUtils';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastProvider';
import Avatar from './Avatar';

// Chat de texto por pelada — só entre quem confirmou presença NESSA pelada
// (status 'aprovado' em confirmacoes, sem exceção pro capitão). Fecha
// sozinho depois do horário do jogo: a policy de select em pelada_mensagens
// já bloqueia a leitura, aqui só reflete isso na tela (mesma conta de
// data+horario que o resto do app já usa, ver PeladaClient.js/podeEncerrar).
export default function PeladaChat({ game }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  const [mensagens, setMensagens] = useState([]);
  const [autores, setAutores] = useState({});
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef(null);
  const autoresRef = useRef({});

  const souAprovado = souAprovadoDe(game, user?.id);
  const jaAconteceu = jaAconteceuDe(game);

  // Guarda os ids já buscados num ref (não no state) pra não refazer a
  // mesma consulta de profile a cada mensagem nova de alguém que já
  // apareceu no chat, sem deixar essa checagem instável na dependência do
  // useEffect que abre o canal do Realtime.
  const carregarAutores = useCallback(async (ids) => {
    const faltando = ids.filter((id) => !autoresRef.current[id]);
    if (faltando.length === 0) return;
    const { data } = await supabase.from('profiles').select('id, nome, foto_url').in('id', faltando);
    const novos = Object.fromEntries((data || []).map((p) => [p.id, p]));
    autoresRef.current = { ...autoresRef.current, ...novos };
    setAutores((prev) => ({ ...prev, ...novos }));
  }, [supabase]);

  useEffect(() => {
    if (!souAprovado || jaAconteceu) return;
    let ativo = true;

    async function carregar() {
      const { data } = await supabase
        .from('pelada_mensagens')
        .select('*')
        .eq('game_id', game.id)
        .order('criado_em', { ascending: true });
      if (!ativo) return;
      const rows = data || [];
      setMensagens(rows);
      carregarAutores([...new Set(rows.map((m) => m.user_id))]);
    }
    carregar();

    const channel = supabase
      .channel(`pelada-chat-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pelada_mensagens', filter: `game_id=eq.${game.id}` },
        (payload) => {
          setMensagens((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
          carregarAutores([payload.new.user_id]);
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
    };
  }, [souAprovado, jaAconteceu, supabase, game.id, carregarAutores]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [mensagens.length]);

  async function enviar(e) {
    e.preventDefault();
    const limpo = texto.trim();
    if (!limpo || enviando) return;
    setEnviando(true);
    const res = await fetch(`/api/games/${game.id}/mensagens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: limpo }),
    });
    const result = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) { showToast(result.error || 'Não consegui enviar sua mensagem.', 'error'); return; }
    setTexto('');
  }

  if (!souAprovado) return null;

  return (
    <div className="pl-chat-card">
      {jaAconteceu ? (
        <div className="pl-chat-encerrado">
          <b>Chat encerrado</b>
          <p>Essa pelada já rolou — o chat fechou junto com ela.</p>
        </div>
      ) : (
        <>
          <div className="pl-chat-list" ref={listRef}>
            {mensagens.length === 0 ? (
              <div className="pl-chat-empty">
                Nenhuma mensagem ainda — chama a galera pra confirmar.
              </div>
            ) : (
              mensagens.map((m, i) => {
                const autor = autores[m.user_id];
                const propria = m.user_id === user?.id;
                // Não repete avatar/nome quando a mesma pessoa manda várias
                // mensagens seguidas — só na primeira bolha da sequência.
                const anterior = mensagens[i - 1];
                const primeiraDaSequencia = !anterior || anterior.user_id !== m.user_id;
                return (
                  <div key={m.id} className={`pl-chat-msg ${propria ? 'own' : ''} ${primeiraDaSequencia ? '' : 'seguida'}`}>
                    {!propria && (primeiraDaSequencia
                      ? <Avatar nome={autor?.nome || '?'} fotoUrl={autor?.foto_url} size={22} />
                      : <span className="pl-chat-avatar-spacer" />
                    )}
                    <div>
                      <div className="pl-chat-bubble">
                        {!propria && primeiraDaSequencia && <span className="pl-chat-author">{autor?.nome || '...'}</span>}
                        <p>{m.texto}</p>
                      </div>
                      <span className="pl-chat-time">
                        {new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={enviar} className="pl-chat-form">
            <div className="pl-chat-form-row">
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreve uma mensagem..."
                maxLength={LIMITE_CARACTERES}
              />
              <button type="submit" className="pl-chat-send" disabled={enviando || !texto.trim()} aria-label="Enviar">➤</button>
            </div>
            <div className="pl-chat-counter">{texto.length}/{LIMITE_CARACTERES}</div>
          </form>
        </>
      )}
    </div>
  );
}
