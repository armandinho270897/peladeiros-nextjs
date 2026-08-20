'use client';
import { useEffect, useState } from 'react';
import Avatar from '../../components/Avatar';
import CaptainIcon from '../../components/CaptainIcon';
import PlayerSearch from '../../components/PlayerSearch';
import BackLink from '../../components/BackLink';
import { useToast } from '../../components/ToastProvider';
import { MODALIDADE_LABEL, POSICAO_LABEL } from '@/lib/gameUtils';

export default function TimeClient({ id }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/times/${id}`);
    if (!res.ok) { setData(null); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function convidar(jogador) {
    if (!jogador.id) { showToast('Esse jogador precisa ter conta pra ser convidado.', 'error'); return; }
    const res = await fetch(`/api/times/${id}/convidar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: jogador.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(json.error || 'Não consegui convidar.', 'error'); return; }
    showToast(`Convite enviado pra ${jogador.nome}!`);
    load();
  }

  if (loading) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/times" /></div>
        <div className="pl-perfil-header">
          <div className="pl-skeleton" style={{ width: 80, height: 80, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}><div className="pl-skeleton" style={{ width: '60%', height: 22 }} /></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/times" /></div>
        <div className="pl-empty"><p>Time não encontrado.</p></div>
      </div>
    );
  }

  const { time, capitao, membros, pendentes, souCapitao } = data;
  const membrosIds = membros.map((m) => m.profiles?.id).filter(Boolean);

  return (
    <div>
      <div className="pl-header">
        <BackLink href="/times" />
      </div>

      <div className="pl-perfil-header">
        <Avatar nome={time.nome} size={80} ring fotoUrl={time.escudo_url} />
        <div className="pl-perfil-info">
          <h2>{time.nome}</h2>
          <p>{time.bairro || 'Bairro não informado'}</p>
          {time.modalidade && <p className="meta">{MODALIDADE_LABEL[time.modalidade] || time.modalidade}</p>}
          {capitao && <p className="meta"><CaptainIcon /> Capitão: <b>{capitao.nome}</b></p>}
        </div>
      </div>

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
        Membros ({membros.length})
      </div>
      <div className="pl-list" style={{ paddingBottom: souCapitao ? 0 : 24 }}>
        {membros.map((m) => {
          const p = m.profiles;
          if (!p) return null;
          return (
            <div key={m.id} className="pl-card">
              <Avatar nome={p.nome} size={48} fotoUrl={p.foto_url} />
              <div className="pl-info">
                <h3>{p.nome}{m.papel === 'capitao' && ' · Capitão'}</h3>
                {p.posicoes?.length > 0 && <p className="meta">{p.posicoes.map((s) => POSICAO_LABEL[s] || s).join(' / ')}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {souCapitao && (
        <>
          <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
            Convidar jogador
          </div>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
            <PlayerSearch onSelect={convidar} excludeIds={membrosIds} placeholder="Buscar jogador pra convidar..." />
          </div>

          {pendentes.length > 0 && (
            <>
              <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
                Convites pendentes
              </div>
              <div className="pl-list" style={{ paddingBottom: 24 }}>
                {pendentes.map((m) => (
                  <div key={m.id} className="pl-card">
                    <Avatar nome={m.profiles?.nome || '?'} size={48} fotoUrl={m.profiles?.foto_url} />
                    <div className="pl-info"><h3>{m.profiles?.nome}</h3><p className="meta">Aguardando resposta</p></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
