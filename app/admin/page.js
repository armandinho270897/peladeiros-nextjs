'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const PERIODOS = [{ id: 'hoje', label: 'Hoje' }, { id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }];

export default function AdminOverviewPage() {
  const [periodo, setPeriodo] = useState('7d');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (p) => {
    setLoading(true);
    const res = await fetch(`/api/admin/overview?periodo=${p}`);
    const json = await res.json();
    setDados(json);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(periodo); }, [periodo, carregar]);

  return (
    <div>
      <div className="pl-admin-toolbar">
        {PERIODOS.map((p) => (
          <button key={p.id} type="button" className={`pl-tab ${periodo === p.id ? 'active' : ''}`} onClick={() => setPeriodo(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {loading || !dados ? (
        <div className="pl-admin-stat-grid">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="pl-skeleton" style={{ height: 76 }} />)}
        </div>
      ) : (
        <div className="pl-admin-stat-grid">
          <div className="pl-admin-stat"><div className="num">{dados.novosUsuarios}</div><div className="label">Novos usuários</div></div>
          <div className="pl-admin-stat"><div className="num">{dados.peladasCriadas}</div><div className="label">Peladas criadas</div></div>
          <div className="pl-admin-stat"><div className="num">{dados.confirmacoes}</div><div className="label">Confirmações</div></div>
          <div className="pl-admin-stat"><div className="num">{dados.cancelamentos}</div><div className="label">Cancelamentos</div></div>
          <div className="pl-admin-stat"><div className="num">{dados.faltas}</div><div className="label">Faltas</div></div>
          <Link href="/admin/arenas" className={`pl-admin-stat ${dados.arenasPendentes > 0 ? 'alerta' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="num">{dados.arenasPendentes}</div><div className="label">Arenas pendentes</div>
          </Link>
          <Link href="/admin/denuncias" className={`pl-admin-stat ${dados.denunciasPendentes > 0 ? 'alerta' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="num">{dados.denunciasPendentes}</div><div className="label">Denúncias pendentes</div>
          </Link>
        </div>
      )}
    </div>
  );
}
