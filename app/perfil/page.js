'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from '../components/Avatar';
import EditProfileModal from '../components/EditProfileModal';
import AvaliarModal from '../components/AvaliarModal';
import CaptainIcon from '../components/icons/CaptainIcon';
import EmptyState, { EmptyAcao } from '../components/EmptyState';
import ConquistasBadges from '../components/ConquistasBadges';
import FichaJogador from '../components/FichaJogador';
import PerfilSobre from '../components/PerfilSobre';
import PerfilTags from '../components/PerfilTags';
import TicketButton from '../components/TicketButton';
import { fmtDate, fmtHora, RESULTADO_LABEL, RESULTADO_COR } from '@/lib/gameUtils';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../components/AuthProvider';

export default function PerfilPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [avaliarGame, setAvaliarGame] = useState(null);
  const { showToast } = useToast();
  const { signOut } = useAuth();

  async function load() {
    setLoading(true);
    const res = await fetch('/api/perfil');
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return (
      <div>
        <div className="pl-perfil-header">
          <div className="pl-skeleton" style={{ width: 80, height: 80, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="pl-skeleton" style={{ width: '60%', height: 22, marginBottom: 8 }} />
            <div className="pl-skeleton" style={{ width: '40%', height: 14 }} />
          </div>
        </div>
        <div className="pl-perfil-stats">
          {[1, 2, 3].map((i) => <div key={i} className="pl-skeleton" style={{ flex: 1, height: 64, minWidth: 96 }} />)}
        </div>
      </div>
    );
  }

  const { profile, stats, historico, conquistas, patente, tags } = data;

  return (
    <div>
      <FichaJogador profile={profile} stats={stats} patente={patente} />

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 640, padding: '0 16px', marginLeft: 'auto', marginRight: 'auto' }}>
        <button className="pl-share-btn" onClick={() => setEditOpen(true)}>Editar perfil</button>
        <Link href="/minhas-peladas" className="pl-share-btn" style={{ textDecoration: 'none' }}>Minhas peladas</Link>
        <Link href="/times" className="pl-share-btn" style={{ textDecoration: 'none' }}>Meus times</Link>
        <Link href="/configuracoes" className="pl-share-btn" style={{ textDecoration: 'none' }}>Notificações</Link>
        {profile.role === 'admin' && (
          <Link href="/admin" className="pl-share-btn" style={{ textDecoration: 'none' }}>Administração</Link>
        )}
        <button className="pl-share-btn" onClick={signOut}>Sair</button>
      </div>

      <p className="pl-perfil-stats-nota">
        Sua Moral considera desempenho nas avaliações, presença, pontualidade e fair play — pontualidade e fair play começam neutros até você ter histórico suficiente, nunca derrubam a nota por falta de dado.
        {(stats.totalPeladasPassadas > 0 || stats.percentualPontualidade != null) && (
          <> Presença conta peladas passadas em que você não foi marcado como falta. Pontualidade considera só as partidas com check-in registrado: chegou até 10min do horário marcado conta como pontual.</>
        )}
      </p>

      <PerfilTags tags={tags} />

      <PerfilSobre profile={profile} />

      <ConquistasBadges conquistas={conquistas} />

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Times</div>
      {data.times?.length > 0 ? (
        <div className="pl-list" style={{ paddingBottom: 8 }}>
          {data.times.map((t) => (
            <Link key={t.id} href={`/time/${t.id}`} className="pl-card" style={{ textDecoration: 'none' }}>
              <Avatar nome={t.nome} size={44} fotoUrl={t.escudo_url} />
              <div className="pl-info">
                <h3>{t.nome}</h3>
                <p className="meta">{t.papel === 'capitao' ? 'Capitão' : 'Membro'}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="meta" style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
          Você ainda não faz parte de nenhum time. <Link href="/times" style={{ color: 'var(--neon)' }}>Criar ou entrar num time</Link>.
        </p>
      )}

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Histórico de peladas</div>

      {historico.length === 0 ? (
        <EmptyState cena="placar" marca="Histórico zerado." titulo="Sem jogo por aqui" sub="Confirma presença numa pelada pra ela aparecer aqui depois.">
          <EmptyAcao href="/peladas">Ver peladas</EmptyAcao>
        </EmptyState>
      ) : (
        <div className="pl-list" style={{ paddingBottom: 24 }}>
          {historico.map((g) => {
            const d = fmtDate(g.data);
            return (
              <div key={g.id} className="pl-card">
                <div className="pl-date"><div className="dow">{d.dow}</div><div className="dom">{d.dom}</div></div>
                <div className="pl-info">
                  <h3>{g.local}</h3>
                  <p className="meta">{fmtHora(g.horario)}</p>
                  <span className="pl-bairro-tag">{g.bairro}</span>
                  <p className="meta"><CaptainIcon /> Capitão: <b>{g.capitao}</b></p>
                  {g.placar_time_a != null && g.placar_time_b != null && (
                    <p className="meta">
                      Placar: Time A {g.placar_time_a} x {g.placar_time_b} Time B
                      {g.resultado && (
                        <span className="pl-bairro-tag" style={{ marginLeft: 6, color: RESULTADO_COR[g.resultado] }}>{RESULTADO_LABEL[g.resultado]}</span>
                      )}
                    </p>
                  )}
                  {g.presente === false && <p className="meta" style={{ color: 'var(--tag-red)' }}>Falta registrada</p>}
                </div>
                <div style={{ textAlign: 'center' }}>
                  {g.encerrada_em ? (
                    <TicketButton compact onClick={() => setAvaliarGame(g)}>Avaliar jogadores</TicketButton>
                  ) : (
                    <p className="pl-aguardando">Aguardando o capitão encerrar</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editOpen && (
        <EditProfileModal onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); showToast('Perfil atualizado!'); load(); }} />
      )}

      {avaliarGame && (
        <AvaliarModal game={avaliarGame} onClose={() => setAvaliarGame(null)} onSaved={() => { setAvaliarGame(null); showToast('Avaliação enviada!'); }} />
      )}
    </div>
  );
}
