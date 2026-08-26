'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import TicketButton from '../components/TicketButton';
import LoadingBall from '../components/LoadingBall';
import Brand from '../components/Brand';
import NightPitchBackground from '../components/NightPitchBackground';
import PitchBall from '../components/PitchBall';
import FloatingInput from '../components/FloatingInput';
import BtnBall from '../components/BtnBall';

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
      <NightPitchBackground />
      <PitchBall />
      <div className="pl-authcard">
        <div className="pl-stagger-1"><Brand /></div>
        <h3 className="pl-stagger-2">Completar perfil</h3>
        <p className="pl-hint pl-stagger-2">Só na primeira vez — é o que aparece pros outros jogadores.</p>
        {authLoading ? (
          <LoadingBall />
        ) : (
          <form onSubmit={handleSubmit} className="pl-stagger-3">
            <FloatingInput label="Nome" name="nome" required />
            <FloatingInput label="WhatsApp" name="whatsapp" required />
            <FloatingInput label="Bairro (opcional)" name="bairro" />
            {error && <p className="pl-error">{error}</p>}
            <TicketButton type="submit" style={{ width: '100%' }} disabled={loading || !user}>
              {loading ? <BtnBall /> : 'Salvar e continuar'}
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
