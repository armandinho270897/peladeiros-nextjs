'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import TicketButton from '../components/TicketButton';
import LoadingBall from '../components/LoadingBall';

function CompletarPerfilForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const { user, profile, loading: authLoading } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Defesa extra: se o perfil já existe (ex: reabriu a aba depois de já ter
  // salvo, ou o estado do AuthProvider tava desatualizado quando a página
  // montou), não mostra o formulário de novo — só segue pra frente.
  useEffect(() => {
    if (!authLoading && profile) window.location.href = next;
  }, [authLoading, profile, next]);

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
    // Navegação completa (não router.push) daqui pra frente — o router
    // cache do Next às vezes serve uma versão de "/" que ainda não viu o
    // perfil recém-criado, e a pessoa fica presa nesta tela achando que
    // não salvou (mesmo o insert tendo funcionado). Isso é o que causou o
    // usuário a tentar de novo e esbarrar no "duplicate key" abaixo.
    if (error) {
      // "duplicate key" (23505) = o perfil já foi salvo antes (ex: clique
      // duplo, ou reenvio depois de rede lenta) — não é erro de verdade
      // pro usuário, só segue pra frente em vez de travar ele aqui.
      if (error.code === '23505') {
        window.location.href = next;
        return;
      }
      setLoading(false);
      setError(error.message || 'Não consegui salvar. Tenta de novo.');
      return;
    }
    window.location.href = next;
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
