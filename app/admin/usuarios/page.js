'use client';
import { useState } from 'react';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../components/AuthProvider';
import { ADMIN_USER_ID } from '@/lib/adminConfig';
import EmptyFieldIcon from '../../components/EmptyFieldIcon';
import MotivoModal from '../MotivoModal';

const STATUS_BADGE = { ativo: 'positivo', advertido: '', suspenso: 'negativo', bloqueado: 'negativo' };

export default function AdminUsuariosPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const souSuperAdmin = user?.id === ADMIN_USER_ID;

  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [modal, setModal] = useState(null);

  async function buscar(e) {
    e.preventDefault();
    if (!busca.trim()) return;
    setBuscando(true);
    const res = await fetch(`/api/admin/usuarios?busca=${encodeURIComponent(busca.trim())}`);
    const data = await res.json();
    setResultados(Array.isArray(data) ? data : []);
    setBuscando(false);
  }

  async function abrirDetalhe(id) {
    setSelecionadoId(id);
    setCarregandoDetalhe(true);
    const res = await fetch(`/api/admin/usuarios/${id}`);
    const data = await res.json();
    setDetalhe(res.ok ? data : null);
    setCarregandoDetalhe(false);
  }

  function fecharDetalhe() {
    setSelecionadoId(null);
    setDetalhe(null);
  }

  async function moderar(acao, motivo, diasSuspensao) {
    const res = await fetch(`/api/admin/usuarios/${selecionadoId}/moderar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao, motivo, diasSuspensao }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    setDetalhe((prev) => ({ ...prev, profile: { ...prev.profile, ...result } }));
    setModal(null);
    showToast('Ação registrada.');
  }

  async function alterarPapel(role) {
    const res = await fetch(`/api/admin/usuarios/${selecionadoId}/papel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
    });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui alterar.'); return; }
    setDetalhe((prev) => ({ ...prev, profile: { ...prev.profile, role } }));
    showToast(role === 'admin' ? 'Promovido a administrador.' : 'Removido da administração.');
  }

  return (
    <div>
      <form onSubmit={buscar} className="pl-admin-toolbar">
        <input placeholder="Nome, WhatsApp ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="submit" className="pl-btn-secondary" disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar'}</button>
      </form>

      {resultados.length === 0 && !buscando ? (
        <div className="pl-empty"><EmptyFieldIcon /><p>Busca um jogador pelo nome, WhatsApp ou e-mail.</p></div>
      ) : (
        <div className="pl-admin-cards">
          {resultados.map((u) => (
            <button key={u.id} type="button" className="pl-card" style={{ textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer' }} onClick={() => abrirDetalhe(u.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>{u.nome}</h3>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>{u.whatsapp} · {u.bairro || 'sem bairro'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {u.role === 'admin' && <span className="pl-admin-badge positivo">admin</span>}
                  <span className={`pl-admin-badge ${STATUS_BADGE[u.status]}`}>{u.status}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selecionadoId && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && fecharDetalhe()}>
          <div className="pl-modal">
            {carregandoDetalhe || !detalhe ? (
              <div className="pl-skeleton" style={{ height: 200 }} />
            ) : (
              <>
                <h3>{detalhe.profile.nome}</h3>
                <p style={{ fontSize: 12, color: 'var(--paper-dim)' }}>{detalhe.profile.email || 'sem e-mail'} · {detalhe.profile.whatsapp}</p>
                <div className="pl-admin-stat-grid" style={{ margin: '10px 0' }}>
                  <div className="pl-admin-stat"><div className="num">{detalhe.stats.participacoes}</div><div className="label">Participações</div></div>
                  <div className="pl-admin-stat"><div className="num">{detalhe.stats.presencas}</div><div className="label">Presenças</div></div>
                  <div className="pl-admin-stat"><div className="num">{detalhe.stats.cancelamentos}</div><div className="label">Cancelamentos</div></div>
                  <div className="pl-admin-stat alerta"><div className="num">{detalhe.stats.faltas}</div><div className="label">Faltas</div></div>
                  <div className="pl-admin-stat alerta"><div className="num">{detalhe.stats.denunciasRecebidas}</div><div className="label">Denúncias recebidas</div></div>
                </div>

                <p>
                  Status atual: <span className={`pl-admin-badge ${STATUS_BADGE[detalhe.profile.status]}`}>{detalhe.profile.status}</span>
                  {detalhe.profile.moderacao_motivo && <span style={{ display: 'block', fontSize: 12, color: 'var(--paper-dim)', marginTop: 4 }}>Motivo: {detalhe.profile.moderacao_motivo}</span>}
                </p>

                <div className="pl-admin-row-actions" style={{ marginTop: 10 }}>
                  {detalhe.profile.status !== 'advertido' && <button type="button" className="pl-btn-secondary" onClick={() => setModal('advertir')}>Advertir</button>}
                  {detalhe.profile.status !== 'suspenso' && <button type="button" className="pl-btn-secondary" onClick={() => setModal('suspender')}>Suspender</button>}
                  {detalhe.profile.status !== 'ativo' && <button type="button" className="pl-btn-secondary" onClick={() => setModal('reativar')}>Reativar</button>}
                  {detalhe.profile.status !== 'bloqueado' && <button type="button" className="pl-btn-secondary pl-btn-danger" onClick={() => setModal('bloquear')}>Bloquear</button>}
                </div>

                {souSuperAdmin && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(110,113,120,0.35)' }}>
                    <p style={{ fontSize: 12, color: 'var(--paper-dim)' }}>Papel de administração (só você pode alterar isso):</p>
                    {detalhe.profile.role === 'admin' ? (
                      <button type="button" className="pl-btn-secondary" onClick={() => alterarPapel('user')}>Remover admin</button>
                    ) : (
                      <button type="button" className="pl-btn-secondary" onClick={() => alterarPapel('admin')}>Promover a admin</button>
                    )}
                  </div>
                )}

                <div className="pl-modal-actions"><button type="button" className="pl-btn-secondary" onClick={fecharDetalhe}>Fechar</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {modal && (
        <MotivoModal
          titulo={{ advertir: 'Advertir jogador', suspender: 'Suspender jogador', reativar: 'Reativar conta', bloquear: 'Bloquear conta' }[modal]}
          perigoso={modal === 'bloquear' || modal === 'suspender'}
          labelBotao="Confirmar"
          onCancel={() => setModal(null)}
          onConfirm={(motivo) => moderar(modal, motivo)}
        />
      )}
    </div>
  );
}
