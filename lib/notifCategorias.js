import BaseballGloveIcon from '@/app/components/BaseballGloveIcon';
import TicketIcon from '@/app/components/TicketIcon';
import CheckMarkIcon from '@/app/components/CheckMarkIcon';
import HazardSignIcon from '@/app/components/HazardSignIcon';
import StopwatchIcon from '@/app/components/StopwatchIcon';
import CrossMarkIcon from '@/app/components/CrossMarkIcon';
import HourglassIcon from '@/app/components/HourglassIcon';
import PositionMarkerIcon from '@/app/components/PositionMarkerIcon';
import TalkIcon from '@/app/components/TalkIcon';
import TShirtIcon from '@/app/components/TShirtIcon';
import ExitDoorIcon from '@/app/components/ExitDoorIcon';
import CrownIcon from '@/app/components/CrownIcon';
import TrashCanIcon from '@/app/components/TrashCanIcon';
import BellIcon from '@/app/components/BellIcon';

// Fonte única de verdade sobre cada tipo de aviso: categoria (pra separar
// Urgentes de Comunidade na tela de avisos e em Configurações), ícone
// (componente SVG, game-icons.net CC BY 3.0 — crédito consolidado em
// Configurações), cor semântica (neon = ação/positivo, lilas =
// social/time, concrete = neutro/negativo) e texto amigável. Um tipo novo
// só precisa entrar aqui pra aparecer corretamente em todos os lugares.
// solicitacao_pendente não tem Icone próprio porque sempre renderiza como
// avatar de quem pediu (tem ator_user_id garantido na criação) — o ícone
// aqui só existiria como fallback teórico, nunca visto na prática.
export const NOTIF_TIPOS = [
  { id: 'goleiro_faltando', categoria: 'urgente', Icone: BaseballGloveIcon, cor: 'neon', label: 'Falta confirmar um goleiro' },
  { id: 'vaga_liberada_espera', categoria: 'urgente', Icone: TicketIcon, cor: 'neon', label: 'Uma vaga abriu pra você' },
  { id: 'aprovado_aguardando_confirmacao', categoria: 'urgente', Icone: CheckMarkIcon, cor: 'neon', label: 'Você foi aprovado (falta confirmar a vaga)' },
  { id: 'conflito_horario', categoria: 'urgente', Icone: HazardSignIcon, cor: 'concrete', label: 'Solicitação cancelada por conflito de horário' },
  { id: 'partida_proxima', categoria: 'urgente', Icone: StopwatchIcon, cor: 'neon', label: 'Sua partida está próxima' },
  { id: 'solicitacao_pendente', categoria: 'urgente', label: 'Alguém pediu pra entrar na sua pelada' },
  { id: 'solicitacao_rejeitada', categoria: 'comunidade', Icone: CrossMarkIcon, cor: 'concrete', label: 'Sua solicitação foi recusada' },
  { id: 'vaga_expirada', categoria: 'comunidade', Icone: HourglassIcon, cor: 'concrete', label: 'Sua vaga expirou por falta de confirmação' },
  { id: 'pelada_nova_perto', categoria: 'comunidade', Icone: PositionMarkerIcon, cor: 'lilas', label: 'Pelada nova no seu bairro' },
  { id: 'pelada_chat', categoria: 'comunidade', Icone: TalkIcon, cor: 'lilas', label: 'Mensagem no chat da pelada' },
  { id: 'convite_time', categoria: 'comunidade', Icone: TShirtIcon, cor: 'lilas', label: 'Convite pra um time' },
  { id: 'convite_time_pelada', categoria: 'comunidade', Icone: TShirtIcon, cor: 'lilas', label: 'Time convidado pra uma pelada' },
  { id: 'convite_time_aceito', categoria: 'comunidade', Icone: TShirtIcon, cor: 'lilas', Indicador: CheckMarkIcon, indicadorCor: 'neon', label: 'Convite pro time foi aceito' },
  { id: 'convite_time_recusado', categoria: 'comunidade', Icone: TShirtIcon, cor: 'lilas', Indicador: CrossMarkIcon, indicadorCor: 'concrete', label: 'Convite pro time foi recusado' },
  { id: 'membro_removido_time', categoria: 'urgente', Icone: ExitDoorIcon, cor: 'concrete', label: 'Você foi removido de um time' },
  { id: 'saida_do_time', categoria: 'comunidade', Icone: ExitDoorIcon, cor: 'concrete', label: 'Alguém saiu do seu time' },
  { id: 'capitania_transferida', categoria: 'urgente', Icone: CrownIcon, cor: 'neon', label: 'Capitania de um time foi transferida' },
  { id: 'time_excluido', categoria: 'urgente', Icone: TrashCanIcon, cor: 'concrete', label: 'Um time foi excluído' },
];

export const NOTIF_TIPO_POR_ID = Object.fromEntries(NOTIF_TIPOS.map((t) => [t.id, t]));

export function categoriaDe(tipo) {
  return NOTIF_TIPO_POR_ID[tipo]?.categoria || 'comunidade';
}

export function iconeDe(tipo) {
  return NOTIF_TIPO_POR_ID[tipo]?.Icone || BellIcon;
}

export function corDe(tipo) {
  return NOTIF_TIPO_POR_ID[tipo]?.cor || 'concrete';
}

export function indicadorDe(tipo) {
  const t = NOTIF_TIPO_POR_ID[tipo];
  return t?.Indicador ? { indicador: t.Indicador, indicadorCor: t.indicadorCor } : {};
}
