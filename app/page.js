'use client';
import { useEffect, useState } from 'react';

const DOW = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
function fmtDate(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  return { dow: DOW[dt.getDay()], dom: String(d).padStart(2,'0') };
}
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'new' | {type:'confirm', game} | {type:'manage', game, unlocked}
  const [error, setError] = useState('');
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    loadGames();
    const saved = localStorage.getItem('peladeiros:perfil');
    if (saved) setPerfil(JSON.parse(saved));
  }, []);

  async function loadGames() {
    setLoading(true);
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const f = e.target;
    const body = {
      local: f.local.value.trim(),
      bairro: f.bairro.value.trim(),
      data: f.data.value,
      horario: f.horario.value,
      vagasTotais: parseInt(f.vagas.value, 10),
      capitao: f.capitao.value.trim(),
      codigo: f.codigo.value.trim(),
    };
    const res = await fetch('/api/games', { method: 'POST', body: JSON.stringify(body) });
    const result = await res.json();
    if (!res.ok) { setError(result.error); return; }
    setModal(null); setError('');
    loadGames();
  }

  async function handleConfirm(e, game) {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    const whatsapp = f.whatsapp.value.trim();
    if (!nome || !whatsapp) { setError('Nome e WhatsApp são obrigatórios.'); return; }
    localStorage.setItem('peladeiros:perfil', JSON.stringify({ nome, whatsapp }));
    setPerfil({ nome, whatsapp });
    const res = await fetch(`/api/games/${game.id}/confirmar`, { method: 'POST', body: JSON.stringify({ nome, whatsapp }) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    setModal(null); setError('');
    loadGames();
  }

  function shareGame(g) {
    const d = fmtDate(g.data);
    const confirmados = (g.confirmacoes || []).filter(c => c.status === 'confirmado').length;
    const restantes = Math.max(0, g.vagas_totais - confirmados);
    const msg = `⚽ Pelada marcada!\n📍 ${g.local} (${g.bairro})\n📅 ${d.dow} ${d.dom} às ${g.horario}\n🔢 ${restantes} vaga(s) livre(s) de ${g.vagas_totais}\n👑 Capitão: ${g.capitao}\n\nConfirma presença: ${window.location.origin}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  const today = todayISO();
  const upcoming = games.filter(g => g.data >= today).sort((a,b) => (a.data+a.horario).localeCompare(b.data+b.horario));
  const hoje = upcoming.filter(g => g.data === today);
  const proximas = upcoming.filter(g => g.data !== today);

  function renderCard(g) {
    const d = fmtDate(g.data);
    const confirmados = (g.confirmacoes || []).filter(c => c.status === 'confirmado');
    const espera = (g.confirmacoes || []).filter(c => c.status === 'espera');
    const restantes = Math.max(0, g.vagas_totais - confirmados.length);
    const lotado = restantes === 0;
    return (
      <div className="pl-card" key={g.id}>
        <button style={{ position:'absolute', top:10, right:12, background:'none', border:'none', color:'var(--paper-dim)', fontSize:11, cursor:'pointer' }}
          onClick={() => setModal({ type: 'manage', game: g, unlocked: false })}>Editar</button>
        <div className="pl-date"><div className="dow">{d.dow}</div><div className="dom">{d.dom}</div></div>
        <div className="pl-info">
          <h3>{g.local}</h3>
          <p className="meta">{g.horario}</p>
          <span className="pl-bairro-tag">{g.bairro}</span>
          <p className="meta">👑 Capitão: <b>{g.capitao}</b></p>
          {espera.length > 0 && <p style={{ color: 'var(--gold)', fontSize: 11 }}>{espera.length} na fila de espera</p>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className={`pl-flip ${lotado ? 'lotado' : ''}`}>{lotado ? 'X' : restantes}</div>
          <div style={{ fontSize: 10, color: 'var(--paper-dim)' }}>{lotado ? 'lotado' : 'vagas'}</div>
          <button className="pl-confirm-btn" onClick={() => setModal({ type: 'confirm', game: g })}>
            {lotado ? 'Entrar na fila' : 'Confirmar'}
          </button>
          <button className="pl-share-btn" onClick={() => shareGame(g)}>Compartilhar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pl-header">
        <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
        <p className="pl-tagline">achou o campo, chamou o povo, bateu bola</p>
        <button className="pl-newbtn" onClick={() => setModal('new')}>+ Criar pelada</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--paper-dim)' }}>Carregando peladas...</div>
      ) : upcoming.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--paper-dim)' }}>
          <div style={{ fontSize: 40 }}>⚽</div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Nenhuma pelada marcada</h3>
          <p>Seja o primeiro a chamar o povo pro campo essa semana.</p>
        </div>
      ) : (
        <>
          {hoje.length > 0 && <>
            <div style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--neon)', textTransform: 'uppercase' }}>Rolando hoje</div>
            <div className="pl-list">{hoje.map(renderCard)}</div>
          </>}
          {proximas.length > 0 && <>
            <div style={{ maxWidth: 640, margin: '22px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Próximas peladas</div>
            <div className="pl-list">{proximas.map(renderCard)}</div>
          </>}
        </>
      )}

      {modal === 'new' && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="pl-modal">
            <h3>Nova pelada</h3>
            <form onSubmit={handleCreate}>
              <div className="pl-field"><label>Local</label><input name="local" placeholder="Ex: Quadra do Zé" /></div>
              <div className="pl-field"><label>Bairro</label><input name="bairro" placeholder="Ex: Centro" /></div>
              <div className="pl-field"><label>Data</label><input type="date" name="data" /></div>
              <div className="pl-field"><label>Horário</label><input type="time" name="horario" /></div>
              <div className="pl-field"><label>Vagas totais</label><input type="number" name="vagas" min="1" max="30" /></div>
              <div className="pl-field"><label>Seu nome (capitão)</label><input name="capitao" /></div>
              <div className="pl-field"><label>Código (4 números)</label><input name="codigo" maxLength={4} /></div>
              {error && <p className="pl-error">{error}</p>}
              <div className="pl-modal-actions">
                <button type="button" className="pl-btn-secondary" onClick={() => { setModal(null); setError(''); }}>Cancelar</button>
                <button type="submit" className="pl-btn-primary">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal?.type === 'confirm' && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="pl-modal">
            <h3>Confirmar presença</h3>
            <form onSubmit={(e) => handleConfirm(e, modal.game)}>
              <div className="pl-field"><label>Seu nome</label><input name="nome" defaultValue={perfil?.nome || ''} /></div>
              <div className="pl-field"><label>WhatsApp</label><input name="whatsapp" defaultValue={perfil?.whatsapp || ''} /></div>
              {error && <p className="pl-error">{error}</p>}
              <div className="pl-modal-actions">
                <button type="button" className="pl-btn-secondary" onClick={() => { setModal(null); setError(''); }}>Cancelar</button>
                <button type="submit" className="pl-btn-primary">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal?.type === 'manage' && (
        <ManageModal
          game={modal.game}
          unlocked={modal.unlocked}
          onUnlock={() => setModal({ ...modal, unlocked: true })}
          onClose={() => { setModal(null); setError(''); }}
          onSaved={() => { setModal(null); loadGames(); }}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
}

function ManageModal({ game, unlocked, onUnlock, onClose, onSaved, error, setError }) {
  const [codigo, setCodigo] = useState('');

  async function tryUnlock(e) {
    e.preventDefault();
    // a validação real acontece no backend na hora de salvar; aqui só liberamos a UI
    // e o backend recusa se o código estiver errado.
    onUnlock();
  }

  async function handleSave(e) {
    e.preventDefault();
    const f = e.target;
    const body = {
      codigo,
      local: f.local.value.trim(),
      bairro: f.bairro.value.trim(),
      data: f.data.value,
      horario: f.horario.value,
      vagasTotais: parseInt(f.vagas.value, 10),
    };
    const res = await fetch(`/api/games/${game.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    onSaved();
  }

  async function handleCancelGame() {
    if (!confirm('Tem certeza? Isso não pode ser desfeito.')) return;
    const res = await fetch(`/api/games/${game.id}`, { method: 'DELETE', body: JSON.stringify({ codigo }) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    onSaved();
  }

  if (!unlocked) {
    return (
      <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="pl-modal">
          <h3>Área do capitão</h3>
          <form onSubmit={tryUnlock}>
            <div className="pl-field"><label>Código</label><input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={4} /></div>
            {error && <p className="pl-error">{error}</p>}
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="pl-btn-primary">Entrar</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Editar pelada</h3>
        <form onSubmit={handleSave}>
          <div className="pl-field"><label>Local</label><input name="local" defaultValue={game.local} /></div>
          <div className="pl-field"><label>Bairro</label><input name="bairro" defaultValue={game.bairro} /></div>
          <div className="pl-field"><label>Data</label><input type="date" name="data" defaultValue={game.data} /></div>
          <div className="pl-field"><label>Horário</label><input type="time" name="horario" defaultValue={game.horario} /></div>
          <div className="pl-field"><label>Vagas totais</label><input type="number" name="vagas" defaultValue={game.vagas_totais} /></div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" style={{ color: 'var(--tag-red)', borderColor: 'var(--tag-red)' }} onClick={handleCancelGame}>Cancelar pelada</button>
            <button type="submit" className="pl-btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
