'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '../../components/Avatar';
import CaptainIcon from '../../components/CaptainIcon';
import PlayerSearch from '../../components/PlayerSearch';
import BackLink from '../../components/BackLink';
import EditTimeModal from '../../components/EditTimeModal';
import TransferirCapitaniaModal from '../../components/TransferirCapitaniaModal';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../components/AuthProvider';
import { MODALIDADE_LABEL, POSICAO_LABEL } from '@/lib/gameUtils';

export default function TimeClient({ id }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showTransferir, setShowTransferir] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function removerMembro(membroId, nome) {
    if (!confirm(`Remover ${nome} do time? Essa ação não pode ser desfeita.`)) return;
    setBusy(true);
    const res = await fetch(`/api/time-membros/${membroId}/remover`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui remover.', 'error'); return; }
    showToast(`${nome} foi removido do time.`);
    load();
  }

  async function sairDoTime(membroId) {
    if (!confirm('Tem certeza que quer sair do time? Isso não pode ser desfeito.')) return;
    setBusy(true);
    const res = await fetch(`/api/time-membros/${membroId}/sair`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui sair do time.', 'error'); return; }
    showToast('Você saiu do time.');
    router.push('/times');
  }

  async function excluirTime() {
    if (!confirm(`Excluir o time ${data.time.nome} pra sempre? Todos os membros perdem acesso e isso não pode ser desfeito.`)) return;
    setBusy(true);
    const res = await fetch(`/api/times/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui excluir o time.', 'error'); return; }
    showToast('Time excluído.');
    router.push('/times');
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
  const minhaMembresia = user ? membros.find((m) => m.user_id === user.id) : null;
  const outrosMembrosAprovados = membros.filter((m) => m.user_id !== user?.id && m.profiles).map((m) => m.profiles);

  return (
    <div>
      <div className="pl-header">
        <div className="pl-header-row">
          <BackLink href="/times" />
          {souCapitao && (
            <button type="button" className="pl-share-btn" style={{ marginTop: 0 }} onClick={() => setShowEdit(true)} disabled={busy}>Editar time</button>
          )}
        </div>
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
          const podeRemover = souCapitao && m.papel !== 'capitao';
          return (
            <div key={m.id} className="pl-card">
              <Avatar nome={p.nome} size={48} fotoUrl={p.foto_url} />
              <div className="pl-info">
                <h3>{p.nome}{m.papel === 'capitao' && ' · Capitão'}</h3>
                {p.posicoes?.length > 0 && <p className="meta">{p.posicoes.map((s) => POSICAO_LABEL[s] || s).join(' / ')}</p>}
              </div>
              {podeRemover && (
                <button type="button" className="pl-share-btn" onClick={() => removerMembro(m.id, p.nome)} disabled={busy}>Remover</button>
              )}
            </div>
          );
        })}
      </div>

      {minhaMembresia && minhaMembresia.papel !== 'capitao' && (
        <div style={{ maxWidth: 640, margin: '0 auto 24px', padding: '0 16px' }}>
          <button type="button" className="pl-share-btn" onClick={() => sairDoTime(minhaMembresia.id)} disabled={busy}>Sair do time</button>
        </div>
      )}

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

          <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
            Gerenciar time
          </div>
          <div style={{ maxWidth: 640, margin: '0 auto 32px', padding: '0 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {outrosMembrosAprovados.length > 0 && (
              <button type="button" className="pl-share-btn" onClick={() => setShowTransferir(true)} disabled={busy}>Transferir capitania</button>
            )}
            <button type="button" className="pl-share-btn" style={{ color: 'var(--tag-red)' }} onClick={excluirTime} disabled={busy}>Excluir time</button>
          </div>
        </>
      )}

      {showEdit && (
        <EditTimeModal
          time={time}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}

      {showTransferir && (
        <TransferirCapitaniaModal
          time={time}
          membros={outrosMembrosAprovados}
          onClose={() => setShowTransferir(false)}
          onTransferred={() => { setShowTransferir(false); load(); }}
        />
      )}
    </div>
  );
}
