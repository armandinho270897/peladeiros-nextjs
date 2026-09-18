'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './components/AuthProvider';
import { useToast } from './components/ToastProvider';
import HomeHero from './components/HomeHero';
import PendingActionCards from './components/PendingActionCards';
import SocialSummaryCard from './components/SocialSummaryCard';
import PatenteCard from './components/PatenteCard';
import PeladasEmDestaque from './components/PeladasEmDestaque';
import MeusTimesDestaque from './components/MeusTimesDestaque';
import HomeFooterCta from './components/HomeFooterCta';
import NewGameModal from './components/NewGameModal';
import AvisoBanner from './components/AvisoBanner';
import DesafiadoWizardModal from './components/DesafiadoWizardModal';
import DesafiadoCta from './components/DesafiadoCta';

// Frase de status do topo — reaproveita a "moral" (lib/moral.js, já
// calculada por /api/perfil), não inventa métrica nova.
function fraseDeStatus(moral, totalPeladasPassadas) {
  if (moral == null) return null;
  if (totalPeladasPassadas === 0) return 'sua jornada começa agora';
  if (moral >= 4) return `moral em alta — ${moral.toFixed(1)} de 5`;
  if (moral >= 3) return `moral em dia — ${moral.toFixed(1)} de 5`;
  return `moral: ${moral.toFixed(1)} de 5`;
}

// Início virou um painel pessoal (pulso + feed + um lembrete), não mais uma
// segunda lista de peladas — isso já existe em /peladas, com filtro/mapa/
// busca de verdade. Ver plano da etapa "redesenho da Home".
export default function Home() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [modal, setModal] = useState(null); // 'new' | 'desafiado' | null
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    if (!user) return;
    carregarPerfil();
  }, [user?.id]);

  function carregarPerfil() {
    fetch('/api/perfil').then((res) => res.json()).then((data) => { if (!data.error) setPerfil(data); });
  }

  // Bottom nav manda pra cá com ?criar=1 pra abrir o modal de criação, que
  // só existe nesta tela (sem inventar rota nova). ?desafiado=1 segue o
  // mesmo par URL+evento, pro mesmo caso (FAB já montado na página, um
  // router.push não remonta o efeito).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('criar') === '1') {
      setModal('new');
      window.history.replaceState(null, '', '/');
    } else if (params.get('desafiado') === '1') {
      setModal('desafiado');
      window.history.replaceState(null, '', '/');
    }
    function onCriarPelada() { setModal('new'); }
    function onIniciarDesafiado() { setModal('desafiado'); }
    window.addEventListener('pl:criar-pelada', onCriarPelada);
    window.addEventListener('pl:iniciar-desafiado', onIniciarDesafiado);
    return () => {
      window.removeEventListener('pl:criar-pelada', onCriarPelada);
      window.removeEventListener('pl:iniciar-desafiado', onIniciarDesafiado);
    };
  }, []);

  function handleCreated() {
    setModal(null);
    carregarPerfil();
    showToast('Pelada criada!');
  }

  const proximaConfirmada = perfil?.proximaConfirmada || null;
  const statusFrase = fraseDeStatus(perfil?.stats?.moral, perfil?.stats?.totalPeladasPassadas);

  return (
    <div>
      <HomeHero profile={profile} statusFrase={statusFrase} patenteId={perfil?.patente?.id} />

      <AvisoBanner />

      <div className="pl-home-blocks">
        <PendingActionCards acaoPendente={perfil?.acaoPendente} onChanged={carregarPerfil} />
        <SocialSummaryCard resumoSocial={perfil?.resumoSocial} />
        <PatenteCard patente={perfil?.patente} />
      </div>

      <PeladasEmDestaque />

      <MeusTimesDestaque times={perfil?.times} />

      <div className="pl-reveal pl-reveal-3" style={{ padding: '0 16px', margin: '18px 0' }}>
        <DesafiadoCta onClick={() => setModal('desafiado')} />
      </div>

      <div className="pl-reveal pl-reveal-4">
        <HomeFooterCta game={proximaConfirmada} loading={perfil === null} />
      </div>

      {modal === 'new' && (
        <NewGameModal onCancel={() => setModal(null)} onCreated={handleCreated} />
      )}

      {modal === 'desafiado' && (
        <DesafiadoWizardModal onCancel={() => setModal(null)} onQuerAgendar={() => setModal('new')} />
      )}
    </div>
  );
}
