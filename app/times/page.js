'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import Avatar from '../components/Avatar';
import EmptyFieldIcon from '../components/EmptyFieldIcon';
import TicketButton from '../components/TicketButton';
import NewTimeModal from '../components/NewTimeModal';
import { MODALIDADE_LABEL } from '@/lib/gameUtils';

export default function TimesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [times, setTimes] = useState([]);
  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoTimeAberto, setNovoTimeAberto] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const [{ data: meusTimes }, { data: pendentes }] = await Promise.all([
      supabase.from('time_membros').select('papel, times(id, nome, escudo_url, bairro, modalidade)').eq('user_id', user.id).eq('status', 'aprovado'),
      supabase.from('time_membros').select('id, times(id, nome, escudo_url, bairro, modalidade)').eq('user_id', user.id).eq('status', 'pendente'),
    ]);
    setTimes((meusTimes || []).map((m) => ({ ...m.times, papel: m.papel })));
    setConvites(pendentes || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function responderConvite(convite, aceitar) {
    const res = await fetch(`/api/time-membros/${convite.id}/${aceitar ? 'aceitar' : 'recusar'}`, { method: 'POST' });
    if (!res.ok) { showToast('Não consegui responder o convite.', 'error'); return; }
    showToast(aceitar ? `Você entrou no time ${convite.times.nome}!` : 'Convite recusado.');
    load();
  }

  return (
    <div>
      <div className="pl-header">
        <Link href="/perfil" style={{ color: 'var(--neon)', fontSize: 13, textDecoration: 'none' }}>&larr; Voltar</Link>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--paper)' }}>Times</h2>
      </div>

      {convites.length > 0 && (
        <>
          <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
            Convites pendentes
          </div>
          <div className="pl-list">
            {convites.map((c) => (
              <div key={c.id} className="pl-card">
                <Avatar nome={c.times.nome} size={48} fotoUrl={c.times.escudo_url} />
                <div className="pl-info">
                  <h3>{c.times.nome}</h3>
                  {c.times.bairro && <span className="pl-bairro-tag">{c.times.bairro}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="pl-btn-secondary" onClick={() => responderConvite(c, false)}>Recusar</button>
                  <TicketButton compact onClick={() => responderConvite(c, true)}>Aceitar</TicketButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Meus times</span>
        <button className="pl-share-btn" onClick={() => setNovoTimeAberto(true)}>+ Criar time</button>
      </div>

      {loading ? (
        <div className="pl-list">
          {[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ height: 72 }} />)}
        </div>
      ) : times.length === 0 ? (
        <div className="pl-empty">
          <EmptyFieldIcon />
          <p>Você ainda não faz parte de nenhum time. Cria o seu ou espera um convite.</p>
        </div>
      ) : (
        <div className="pl-list" style={{ paddingBottom: 24 }}>
          {times.map((t) => (
            <Link key={t.id} href={`/time/${t.id}`} className="pl-card" style={{ textDecoration: 'none' }}>
              <Avatar nome={t.nome} size={48} fotoUrl={t.escudo_url} />
              <div className="pl-info">
                <h3>{t.nome}</h3>
                <p className="meta">
                  {t.papel === 'capitao' ? 'Capitão' : 'Membro'}
                  {t.modalidade && ` · ${MODALIDADE_LABEL[t.modalidade] || t.modalidade}`}
                </p>
                {t.bairro && <span className="pl-bairro-tag">{t.bairro}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {novoTimeAberto && (
        <NewTimeModal
          onClose={() => setNovoTimeAberto(false)}
          onCreated={() => { setNovoTimeAberto(false); showToast('Time criado!'); load(); }}
        />
      )}
    </div>
  );
}
