'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '../../components/Avatar';
import CaptainIcon from '../../components/CaptainIcon';
import PlayerSearch from '../../components/PlayerSearch';
import BackLink from '../../components/BackLink';
import EditTimeModal from '../../components/EditTimeModal';
import TransferirCapitaniaModal from '../../components/TransferirCapitaniaModal';
import DesafiarTimeModal from '../../components/DesafiarTimeModal';
import EditarElencoModal from '../../components/EditarElencoModal';
import TicketButton from '../../components/TicketButton';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../components/AuthProvider';
import UniformPreview from '../../components/UniformPreview';
import { MODALIDADE_LABEL, POSICAO_LABEL, POSICAO_ZONA } from '@/lib/gameUtils';
import { DIA_SEMANA_LABEL, NIVEL_COMPETITIVO_LABEL } from '@/lib/timeConstants';

const RECRUTAMENTO_INFO = {
  procurando_jogadores: { label: 'Recrutando', className: 'aberto' },
  procurando_goleiro: { label: 'Precisa de goleiro', className: 'goleiro' },
};

// Ordem fixa de exibição do elenco por zona — "Outros" pega quem não tem
// posição cadastrada no perfil, sem sumir da lista.
const ZONAS_ORDEM = ['Goleiro', 'Defesa', 'Meio-campo', 'Ataque', 'Outros'];

export default function TimeClient({ id }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showTransferir, setShowTransferir] = useState(false);
  const [showDesafiar, setShowDesafiar] = useState(false);
  const [editandoMembro, setEditandoMembro] = useState(null);
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

  async function aceitarDesafio(desafioId) {
    setBusy(true);
    const res = await fetch(`/api/desafios/${desafioId}/aceitar`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui aceitar o desafio.', 'error'); return; }
    showToast('Desafio aceito! Partida marcada.');
    router.push(`/pelada/${json.gameId}`);
  }

  async function recusarDesafio(desafioId) {
    setBusy(true);
    const res = await fetch(`/api/desafios/${desafioId}/recusar`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui recusar o desafio.', 'error'); return; }
    showToast('Desafio recusado.');
    load();
  }

  async function pedirEntrada() {
    setBusy(true);
    const res = await fetch(`/api/times/${id}/pedir-entrada`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui enviar o pedido.', 'error'); return; }
    showToast('Pedido enviado! O capitão vai responder em breve.');
    load();
  }

  async function aprovarSolicitacao(solicitacaoId, nome) {
    setBusy(true);
    const res = await fetch(`/api/time-membros/${solicitacaoId}/aprovar-solicitacao`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui aprovar o pedido.', 'error'); return; }
    showToast(`${nome} agora é do time!`);
    load();
  }

  async function rejeitarSolicitacao(solicitacaoId) {
    setBusy(true);
    const res = await fetch(`/api/time-membros/${solicitacaoId}/rejeitar-solicitacao`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui recusar o pedido.', 'error'); return; }
    showToast('Pedido recusado.');
    load();
  }

  async function cancelarDesafio(desafioId) {
    if (!confirm('Cancelar esse desafio?')) return;
    setBusy(true);
    const res = await fetch(`/api/desafios/${desafioId}/cancelar`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui cancelar o desafio.', 'error'); return; }
    showToast('Desafio cancelado.');
    load();
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

  async function marcarMensalidade(membroId, pago) {
    setBusy(true);
    const res = await fetch(`/api/time-membros/${membroId}/mensalidade`, { method: pago ? 'POST' : 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui atualizar.', 'error'); return; }
    load();
  }

  async function cobrarMensalidade(membroId, nome) {
    setBusy(true);
    const res = await fetch(`/api/time-membros/${membroId}/cobrar-mensalidade`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { showToast(json.error || 'Não consegui cobrar.', 'error'); return; }
    showToast(`Cobrança enviada pra ${nome}.`);
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

  const { time, capitao, membros, pendentes, solicitacoes = [], minhaRelacao, souCapitao, desafiosRecebidos = [], desafiosEnviados = [], stats, resumoFinanceiro } = data;
  const membrosIds = membros.map((m) => m.profiles?.id).filter(Boolean);
  const minhaMembresia = user ? membros.find((m) => m.user_id === user.id) : null;
  const outrosMembrosAprovados = membros.filter((m) => m.user_id !== user?.id && m.profiles).map((m) => m.profiles);
  const recrutamento = RECRUTAMENTO_INFO[time.recrutamento];
  const podePedirEntrada = !!user && !minhaMembresia && time.recrutamento !== 'fechado' && minhaRelacao !== 'solicitado' && minhaRelacao !== 'pendente';

  // Agrupa o elenco por zona (Goleiro/Defesa/Meio-campo/Ataque) — prioriza
  // a posição atribuída pelo capitão NESSE time (time_membros.posicao,
  // agora editável); sem isso, cai pra primeira posição do perfil do
  // jogador (o que ele mesmo diz que joga, em qualquer time).
  const membrosPorZona = ZONAS_ORDEM.reduce((acc, zona) => ({ ...acc, [zona]: [] }), {});
  membros.forEach((m) => {
    if (!m.profiles) return;
    const posicaoEfetiva = m.posicao || m.profiles.posicoes?.[0];
    const zona = (posicaoEfetiva && POSICAO_ZONA[posicaoEfetiva]) || 'Outros';
    membrosPorZona[zona].push(m);
  });

  function renderMembro(m) {
    const p = m.profiles;
    const podeRemover = souCapitao && m.papel !== 'capitao';
    const posicaoLabel = m.posicao ? POSICAO_LABEL[m.posicao] || m.posicao : p.posicoes?.length > 0 ? p.posicoes.map((s) => POSICAO_LABEL[s] || s).join(' / ') : null;
    return (
      <div key={m.id} className="pl-card">
        {/* display:contents — o Link some da árvore de layout, os
            filhos (Avatar + .pl-info) continuam exatamente onde
            estavam dentro do .pl-card; só o botão Remover, fora
            daqui, fica de fora da área clicável do perfil. */}
        <Link href={`/perfil/${p.id}`} style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
          <Avatar nome={p.nome} size={48} fotoUrl={p.foto_url} />
          <div className="pl-info">
            <h3>{m.numero_camisa != null && `#${m.numero_camisa} `}{p.nome}{m.papel === 'capitao' && ' · Capitão'}</h3>
            {(posicaoLabel || m.mensalista) && (
              <p className="meta">{[posicaoLabel, m.mensalista && 'Mensalista'].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </Link>
        {souCapitao && (
          <button type="button" className="pl-share-btn" onClick={() => setEditandoMembro(m)} disabled={busy}>Editar</button>
        )}
        {podeRemover && (
          <button type="button" className="pl-share-btn pl-btn-danger" onClick={() => removerMembro(m.id, p.nome)} disabled={busy}>Remover</button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="pl-header">
        <div className="pl-header-row">
          <BackLink href="/times" />
          {souCapitao && (
            <button type="button" className="pl-share-btn" style={{ marginTop: 0 }} onClick={() => setShowEdit(true)} disabled={busy}>Editar time</button>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user && !minhaMembresia && time.aceita_desafios && (
              <TicketButton compact style={{ marginTop: 0 }} onClick={() => setShowDesafiar(true)}>Desafiar</TicketButton>
            )}
            {podePedirEntrada && (
              <TicketButton compact style={{ marginTop: 0 }} onClick={pedirEntrada} disabled={busy}>Pedir pra entrar</TicketButton>
            )}
            {minhaRelacao === 'solicitado' && (
              <span className="pl-time-card-recrutamento aberto">Pedido enviado</span>
            )}
          </div>
        </div>
      </div>

      <div className="pl-perfil-header">
        <Avatar nome={time.nome} size={80} ring fotoUrl={time.escudo_url} />
        <div className="pl-perfil-info">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{time.nome}</h2>
            {time.sigla && <span className="pl-time-card-sigla">{time.sigla}</span>}
          </div>
          <p>{time.bairro || 'Bairro não informado'}</p>
          <p className="meta">
            {time.modalidade && (MODALIDADE_LABEL[time.modalidade] || time.modalidade)}
            {time.nivel_competitivo && ` · ${NIVEL_COMPETITIVO_LABEL[time.nivel_competitivo] || time.nivel_competitivo}`}
            {time.ano_fundacao && ` · Desde ${time.ano_fundacao}`}
          </p>
          {capitao && <p className="meta"><CaptainIcon /> Capitão: <b>{capitao.nome}</b></p>}
          {(recrutamento || time.aceita_desafios) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {recrutamento && <span className={`pl-time-card-recrutamento ${recrutamento.className}`}>{recrutamento.label}</span>}
              {time.aceita_desafios && <span className="pl-time-card-recrutamento aberto">Aceita desafios</span>}
            </div>
          )}
        </div>
      </div>

      {stats && (stats.confrontosDisputados > 0 || stats.notaMediaElenco != null) && (
        <div className="pl-perfil-stats">
          <div className="pl-stat">
            <div className="num">{stats.confrontosDisputados}</div>
            <div className="label">Confrontos disputados</div>
          </div>
          <div className="pl-stat">
            <div className="num">{stats.notaMediaElenco != null ? stats.notaMediaElenco.toFixed(1) : '—'}</div>
            <div className="label">Nota média do elenco</div>
          </div>
        </div>
      )}

      {souCapitao && resumoFinanceiro && resumoFinanceiro.mensalistas > 0 && (
        <div className="pl-list" style={{ paddingTop: 0 }}>
          <div className="pl-card" style={{ display: 'block' }}>
            <div className="pl-pending-title pl-section-title">Financeiro — mensalidade deste mês</div>
            {time.mensalidade_valor ? (
              <>
                <p className="meta" style={{ marginBottom: 10 }}>
                  {resumoFinanceiro.pagaram} de {resumoFinanceiro.mensalistas} pagaram · R$ {resumoFinanceiro.valorRecebido.toFixed(2)} de R$ {resumoFinanceiro.valorEsperado.toFixed(2)}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {membros.filter((m) => m.mensalista && m.profiles).map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar nome={m.profiles.nome} size={28} fotoUrl={m.profiles.foto_url} />
                      <span style={{ flex: 1, fontSize: 14 }}>{m.profiles.nome}</span>
                      {m.pagouEsteMes ? (
                        <button type="button" className="pl-share-btn" disabled={busy} onClick={() => marcarMensalidade(m.id, false)}>Pago ✓</button>
                      ) : (
                        <>
                          <button type="button" className="pl-share-btn" disabled={busy} onClick={() => cobrarMensalidade(m.id, m.profiles.nome)}>Cobrar</button>
                          <TicketButton compact disabled={busy} onClick={() => marcarMensalidade(m.id, true)}>Marcar pago</TicketButton>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="pl-hint">Defina o valor da mensalidade em "Editar time" pra controlar os pagamentos.</p>
            )}
          </div>
        </div>
      )}

      {(time.cor_primaria || time.cor_secundaria) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 640, margin: '0 auto 14px', padding: '0 16px' }}>
          <UniformPreview corPrimaria={time.cor_primaria} corSecundaria={time.cor_secundaria} size={40} />
          <span className="meta">Uniforme do time</span>
        </div>
      )}

      {(time.dia_jogo || time.arenas?.nome || time.whatsapp_responsavel) && (
        <div className="pl-ficha-grid">
          {time.dia_jogo && (
            <div className="pl-ficha-card">
              <span className="pl-ficha-card-label">Horário fixo</span>
              <span className="pl-ficha-card-value">{DIA_SEMANA_LABEL[time.dia_jogo] || time.dia_jogo}{time.horario_jogo ? ` · ${time.horario_jogo}` : ''}</span>
            </div>
          )}
          {time.arenas?.nome && (
            <div className="pl-ficha-card">
              <span className="pl-ficha-card-label">Arena</span>
              <span className="pl-ficha-card-value">{time.arenas.nome}</span>
            </div>
          )}
          {time.whatsapp_responsavel && (
            <div className="pl-ficha-card">
              <span className="pl-ficha-card-label">Contato</span>
              <button
                type="button"
                className="pl-ficha-card-value"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--neon)', textAlign: 'left' }}
                onClick={() => window.open(`https://wa.me/55${time.whatsapp_responsavel.replace(/\D/g, '')}`, '_blank')}
              >
                Chamar no WhatsApp
              </button>
            </div>
          )}
        </div>
      )}

      {ZONAS_ORDEM.filter((zona) => membrosPorZona[zona].length > 0).map((zona) => (
        <div key={zona}>
          <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
            {zona} ({membrosPorZona[zona].length})
          </div>
          <div className="pl-list" style={{ paddingBottom: 0 }}>
            {membrosPorZona[zona].map(renderMembro)}
          </div>
        </div>
      ))}
      <div style={{ height: souCapitao ? 8 : 24 }} />

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

          {solicitacoes.length > 0 && (
            <>
              <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
                Pedidos pra entrar
              </div>
              <div className="pl-list" style={{ paddingBottom: 24 }}>
                {solicitacoes.map((s) => (
                  <div key={s.id} className="pl-card">
                    <Avatar nome={s.profiles?.nome || '?'} size={48} fotoUrl={s.profiles?.foto_url} />
                    <div className="pl-info"><h3>{s.profiles?.nome}</h3></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="pl-btn-secondary" onClick={() => rejeitarSolicitacao(s.id)} disabled={busy}>Recusar</button>
                      <TicketButton compact onClick={() => aprovarSolicitacao(s.id, s.profiles?.nome)} disabled={busy}>Aprovar</TicketButton>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {desafiosRecebidos.length > 0 && (
            <>
              <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
                Desafios recebidos
              </div>
              <div className="pl-list" style={{ paddingBottom: 24 }}>
                {desafiosRecebidos.map((d) => (
                  <div key={d.id} className="pl-card">
                    <Avatar nome={d.timeAdversario?.nome || '?'} size={48} fotoUrl={d.timeAdversario?.escudo_url} />
                    <div className="pl-info">
                      <h3>{d.timeAdversario?.nome}</h3>
                      <p className="meta">{d.local} · {d.data} às {d.horario}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="pl-btn-secondary" onClick={() => recusarDesafio(d.id)} disabled={busy}>Recusar</button>
                      <TicketButton compact onClick={() => aceitarDesafio(d.id)} disabled={busy}>Aceitar</TicketButton>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {desafiosEnviados.length > 0 && (
            <>
              <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
                Desafios enviados
              </div>
              <div className="pl-list" style={{ paddingBottom: 24 }}>
                {desafiosEnviados.map((d) => (
                  <div key={d.id} className="pl-card">
                    <Avatar nome={d.timeAdversario?.nome || '?'} size={48} fotoUrl={d.timeAdversario?.escudo_url} />
                    <div className="pl-info">
                      <h3>{d.timeAdversario?.nome}</h3>
                      <p className="meta">{d.local} · {d.data} às {d.horario} · Aguardando resposta</p>
                    </div>
                    <button type="button" className="pl-share-btn" onClick={() => cancelarDesafio(d.id)} disabled={busy}>Cancelar</button>
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
            <button type="button" className="pl-share-btn pl-btn-danger" onClick={excluirTime} disabled={busy}>Excluir time</button>
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

      {showDesafiar && (
        <DesafiarTimeModal
          time={time}
          onClose={() => setShowDesafiar(false)}
          onDesafiado={() => { setShowDesafiar(false); showToast(`Desafio enviado pro ${time.nome}!`); }}
        />
      )}

      {editandoMembro && (
        <EditarElencoModal
          membro={editandoMembro}
          modalidade={time.modalidade}
          onClose={() => setEditandoMembro(null)}
          onSaved={() => { setEditandoMembro(null); showToast('Elenco atualizado!'); load(); }}
        />
      )}
    </div>
  );
}
