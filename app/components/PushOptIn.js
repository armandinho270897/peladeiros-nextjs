'use client';
import { useEffect, useState } from 'react';
import { pushSuportado, statusPush, assinarPush, cancelarPush } from '@/lib/pushNotifications';
import { useToast } from './ToastProvider';
import BellIcon from './icons/BellIcon';

// Card de opt-in pra push de verdade (chega com o app fechado, celular no
// bolso). Fica junto das preferências por tipo em Configurações: aquelas
// decidem QUAIS avisos existem, essa decide SE eles tocam o bolso ou ficam
// só esperando alguém abrir o app. Independente — dá pra desligar aqui sem
// mexer em nenhuma preferência de tipo.
export default function PushOptIn() {
  const { showToast } = useToast();
  const [status, setStatus] = useState('carregando');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!pushSuportado()) { setStatus('indisponivel'); return; }
    statusPush().then(setStatus).catch(() => setStatus('indisponivel'));
  }, []);

  async function ativar() {
    setOcupado(true);
    try {
      await assinarPush();
      setStatus('ativo');
      showToast('Alerta ligado. Agora o aviso chega na hora, direto no aparelho.');
    } catch (err) {
      setStatus(Notification?.permission === 'denied' ? 'negado' : 'inativo');
      showToast(err.message || 'Não deu pra ativar. Tenta de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    await cancelarPush();
    setStatus('inativo');
    setOcupado(false);
    showToast('Alerta desligado.');
  }

  if (status === 'carregando' || status === 'indisponivel') return null;

  return (
    <div className="pl-push-card">
      <span className="pl-push-tag">na hora, sem enrolação</span>
      <div className="pl-push-row">
        <div className={`pl-push-badge ${status === 'ativo' ? 'pl-push-badge-on' : ''}`}>
          <BellIcon size={24} />
        </div>
        <div className="pl-push-copy">
          <h3>Fica ligado</h3>
          {status === 'ativo' ? (
            <p>Avisos te acham mesmo com o app fechado. É só isso, sem spam.</p>
          ) : status === 'negado' ? (
            <p>Você bloqueou notificação pra esse site. Libera lá nas configurações do navegador pra ativar de novo.</p>
          ) : (
            <p>Vaga abriu, time chamou, pelada mudou de hora — o aviso te acha, mesmo com o app fechado.</p>
          )}
        </div>
      </div>
      {status === 'ativo' ? (
        <button type="button" className="pl-push-btn-off" onClick={desativar} disabled={ocupado}>
          {ocupado ? 'Desligando...' : 'Desligar alerta'}
        </button>
      ) : status !== 'negado' ? (
        <button type="button" className="pl-push-btn-on" onClick={ativar} disabled={ocupado}>
          {ocupado ? 'Ativando...' : 'Quero saber na hora'}
        </button>
      ) : null}
    </div>
  );
}
