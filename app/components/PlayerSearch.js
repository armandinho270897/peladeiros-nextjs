'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

// Busca simples em profiles (leitura pública via RLS, mesmo padrão do AuthProvider) —
// sem rota /api dedicada só pra isso.
export default function PlayerSearch({ onSelect, excludeIds = [], placeholder = 'Buscar por nome...' }) {
  const [supabase] = useState(() => createClient());
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const debounceRef = useRef(null);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id,nome,bairro').ilike('nome', `%${q.trim()}%`).limit(8);
      setResultados((data || []).filter((p) => !excludeIds.includes(p.id)));
    }, 300);
  }

  function handleSelect(p) {
    onSelect(p);
    setQuery('');
    setResultados([]);
  }

  function handleAddGuest() {
    handleSelect({ id: null, nome: query.trim() });
  }

  const podeAdicionarConvidado = query.trim().length >= 2;

  return (
    <div className="pl-player-search">
      <input type="text" value={query} onChange={handleChange} placeholder={placeholder} autoComplete="off" />
      {(resultados.length > 0 || podeAdicionarConvidado) && (
        <div className="pl-player-search-results">
          {resultados.map((p) => (
            <button type="button" key={p.id} className="pl-player-search-item" onClick={() => handleSelect(p)}>
              <span>{p.nome}</span>
              {p.bairro && <span className="pl-player-search-bairro">{p.bairro}</span>}
            </button>
          ))}
          {podeAdicionarConvidado && (
            <button type="button" className="pl-player-search-item pl-player-search-guest" onClick={handleAddGuest}>
              <span>Adicionar &ldquo;{query.trim()}&rdquo; sem conta</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
