'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import TicketButton from '../components/TicketButton';
import LoadingBall from '../components/LoadingBall';

function CompletarPerfilForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    const f = e.target;
    const supabase = createClient();
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      nome: f.nome.value.trim(),
      whatsapp: f.whatsapp.value.trim(),
      bairro: f.bairro.value.trim() || null,
    });
    setLoading(false);
    if (error) { setError('Não consegui salvar. Tenta de novo.'); return; }
    await refreshProfile();
    router.push(next);
  }

  return (
    <div className="pl-authpage">
      <div className="pl-authcard">
        <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
        <h3>Completar perfil</h3>
        <p className="pl-hint">Só na primeira vez — é o que aparece pros outros jogadores.</p>
        {authLoading ? (
          <LoadingBall />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="pl-field"><label>Nome</label><input name="nome" required /></div>
            <div className="pl-field"><label>WhatsApp</label><input name="whatsapp" required /></div>
            <div className="pl-field"><label>Bairro (opcional)</label><input name="bairro" /></div>
            {error && <p className="pl-error">{error}</p>}
            <TicketButton type="submit" style={{ width: '100%' }} disabled={loading || !user}>
              {loading ? 'Salvando...' : 'Salvar e continuar'}
            </TicketButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CompletarPerfilPage() {
  return (
    <Suspense fallback={null}>
      <CompletarPerfilForm />
    </Suspense>
  );
}
