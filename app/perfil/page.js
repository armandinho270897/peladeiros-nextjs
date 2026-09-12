'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from '../components/Avatar';
import EditProfileModal from '../components/EditProfileModal';
import AvaliarModal from '../components/AvaliarModal';
import CaptainIcon from '../components/CaptainIcon';
import EmptyFieldIcon from '../components/EmptyFieldIcon';
import ConquistasBadges from '../components/ConquistasBadges';
import PatenteCard from '../components/PatenteCard';
import PerfilSobre from '../components/PerfilSobre';
import PerfilTags from '../components/PerfilTags';
import TicketButton from '../components/TicketButton';
import { fmtDate, MODALIDADE_LABEL, POSICAO_LABEL, RESULTADO_LABEL, RESULTADO_COR } from '@/lib/gameUtils';
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
      <div className="pl-perfil-header">
        <Avatar nome={profile.nome} size={80} ring fotoUrl={profile.foto_url} />
        <div className="pl-perfil-info">
          <h2>{profile.nome}</h2>
          <p>{profile.bairro || 'Bairro não informado'}</p>
          {profile.modalidade_principal && (
            <p className="meta">
              {MODALIDADE_LABEL[profile.modalidade_principal]}
              {profile.posicoes?.length > 0 && ` · ${profile.posicoes.map((s) => POSICAO_LABEL[s] || s).join(' / ')}`}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            <button className="pl-share-btn" onClick={() => setEditOpen(true)}>Editar perfil</button>
            <Link href="/minhas-peladas" className="pl-share-btn" style={{ textDecoration: 'none' }}>Minhas peladas</Link>
            <Link href="/times" className="pl-share-btn" style={{ textDecoration: 'none' }}>Meus times</Link>
            <Link href="/configuracoes" className="pl-share-btn" style={{ textDecoration: 'none' }}>Notificações</Link>
            <button className="pl-share-btn" onClick={signOut}>Sair</button>
          </div>
        </div>
      </div>

      <div className="pl-perfil-stats">
        <div className="pl-stat">
          <div className="num">{stats.peladasConfirmadas}</div>
          <div className="label">Confirmadas</div>
        </div>
        <div className="pl-stat">
          <div className="num">{stats.peladasComoCapitao}</div>
          <div className="label">Como capitão</div>
        </div>
        <div className="pl-stat">
          <div className="num">{stats.notaMedia != null ? stats.notaMedia.toFixed(1) : '—'}</div>
          <div className="label">{stats.notaMedia != null ? `Nota média (${stats.totalAvaliacoes})` : 'Ainda sem avaliações'}</div>
        </div>
        <div className="pl-stat">
          <div className="num">{stats.moral.toFixed(1)}</div>
          <div className="label">Moral</div>
        </div>
        {stats.totalPeladasPassadas > 0 && (
          <div className="pl-stat">
            <div className="num">{stats.percentualPresenca}%</div>
            <div className="label">Presença ({stats.peladasJogadas}/{stats.totalPeladasPassadas})</div>
          </div>
        )}
        {stats.percentualPontualidade != null && (
          <div className="pl-stat">
            <div className="num">{stats.percentualPontualidade}%</div>
            <div className="label">Pontualidade ({stats.partidasComCheckin} c/ check-in)</div>
          </div>
        )}
        {stats.percentualFairPlay != null && (
          <div className="pl-stat">
            <div className="num">{stats.percentualFairPlay}%</div>
            <div className="label">Fair play</div>
          </div>
        )}
      </div>

      <p className="pl-perfil-stats-nota">
        Sua Moral considera desempenho nas avaliações, presença, pontualidade e fair play — pontualidade e fair play começam neutros até você ter histórico suficiente, nunca derrubam a nota por falta de dado.
        {(stats.totalPeladasPassadas > 0 || stats.percentualPontualidade != null) && (
          <> Presença conta peladas passadas em que você não foi marcado como falta. Pontualidade considera só as partidas com check-in registrado: chegou até 10min do horário marcado conta como pontual.</>
        )}
      </p>

      <PatenteCard patente={patente} />

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
        <div className="pl-empty">
          <EmptyFieldIcon />
          <p>Ainda sem histórico por aqui. Confirma presença numa pelada pra ela aparecer aqui depois.</p>
        </div>
      ) : (
        <div className="pl-list" style={{ paddingBottom: 24 }}>
          {historico.map((g) => {
            const d = fmtDate(g.data);
            return (
              <div key={g.id} className="pl-card">
                <div className="pl-date"><div className="dow">{d.dow}</div><div className="dom">{d.dom}</div></div>
                <div className="pl-info">
                  <h3>{g.local}</h3>
                  <p className="meta">{g.horario}</p>
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
