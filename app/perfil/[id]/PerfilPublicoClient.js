'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '../../components/Avatar';
import CaptainIcon from '../../components/icons/CaptainIcon';
import EmptyFieldIcon from '../../components/icons/EmptyFieldIcon';
import ConquistasBadges from '../../components/ConquistasBadges';
import FichaJogador from '../../components/FichaJogador';
import PerfilSobre from '../../components/PerfilSobre';
import PerfilTags from '../../components/PerfilTags';
import BackLink from '../../components/BackLink';
import DenunciarModal from '../../components/DenunciarModal';
import { useToast } from '../../components/ToastProvider';
import { fmtDate, RESULTADO_LABEL, RESULTADO_COR } from '@/lib/gameUtils';

// Perfil público de OUTRO jogador — mesma estrutura visual de app/perfil/page.js
// (avatar, stats, conquistas, times, histórico), mas sem nenhum controle
// self-only (editar, sair, notificações, avaliar jogadores): quem visita
// aqui não é o dono da conta. Se a própria pessoa cair aqui vendo o próprio
// id, /api/perfil devolve souEu:true e a gente manda pra /perfil (URL
// canônica do próprio perfil continua sendo essa).
export default function PerfilPublicoClient({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [denunciando, setDenunciando] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(false);
    fetch(`/api/perfil?userId=${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (cancelado) return;
        if (json.souEu) { router.replace('/perfil'); return; }
        setData(json);
        setLoading(false);
      })
      .catch(() => { if (!cancelado) { setErro(true); setLoading(false); } });
    return () => { cancelado = true; };
  }, [id, router]);

  if (loading || !data) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/peladas" /></div>
        {erro ? (
          <div className="pl-empty">
            <EmptyFieldIcon />
            <p>Não achei esse jogador.</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    );
  }

  const { profile, stats, historico, conquistas, patente, tags } = data;

  return (
    <div>
      <div className="pl-header"><BackLink href="/peladas" /></div>

      <FichaJogador profile={profile} stats={stats} patente={patente} celebrar={false} />

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button type="button" className="pl-link-muted" onClick={() => setDenunciando(true)}>
          Denunciar jogador
        </button>
      </div>

      {denunciando && (
        <DenunciarModal
          alvoTipo="jogador"
          alvoId={id}
          alvoLabel="jogador"
          onClose={() => setDenunciando(false)}
          onEnviado={() => { setDenunciando(false); showToast('Denúncia enviada. A administração vai analisar.'); }}
        />
      )}

      <p className="pl-perfil-stats-nota">
        Moral considera desempenho nas avaliações, presença, pontualidade e fair play — pontualidade e fair play começam neutros até haver histórico suficiente.
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
        <p className="meta" style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>Ainda não faz parte de nenhum time.</p>
      )}

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Histórico de peladas</div>

      {historico.length === 0 ? (
        <div className="pl-empty">
          <EmptyFieldIcon />
          <p>Ainda sem histórico por aqui.</p>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
