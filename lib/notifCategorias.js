// Fonte única de verdade sobre cada tipo de aviso: categoria (pra separar
// Urgentes de Comunidade na tela de avisos e em Configurações), ícone e
// texto amigável. Um tipo novo só precisa entrar aqui pra aparecer
// corretamente nos dois lugares.
export const NOTIF_TIPOS = [
  { id: 'goleiro_faltando', categoria: 'urgente', icone: '🧤', label: 'Falta confirmar um goleiro' },
  { id: 'vaga_liberada_espera', categoria: 'urgente', icone: '🎟️', label: 'Uma vaga abriu pra você' },
  { id: 'aprovado_aguardando_confirmacao', categoria: 'urgente', icone: '✅', label: 'Você foi aprovado (falta confirmar a vaga)' },
  { id: 'conflito_horario', categoria: 'urgente', icone: '⚠️', label: 'Solicitação cancelada por conflito de horário' },
  { id: 'partida_proxima', categoria: 'urgente', icone: '⏰', label: 'Sua partida está próxima' },
  { id: 'solicitacao_pendente', categoria: 'urgente', icone: '🙋', label: 'Alguém pediu pra entrar na sua pelada' },
  { id: 'solicitacao_rejeitada', categoria: 'comunidade', icone: '🚫', label: 'Sua solicitação foi recusada' },
  { id: 'vaga_expirada', categoria: 'comunidade', icone: '⌛', label: 'Sua vaga expirou por falta de confirmação' },
  { id: 'pelada_nova_perto', categoria: 'comunidade', icone: '📍', label: 'Pelada nova no seu bairro' },
  { id: 'pelada_chat', categoria: 'comunidade', icone: '💬', label: 'Mensagem no chat da pelada' },
  { id: 'convite_time', categoria: 'comunidade', icone: '👕', label: 'Convite pra um time' },
  { id: 'convite_time_pelada', categoria: 'comunidade', icone: '👕', label: 'Time convidado pra uma pelada' },
  { id: 'convite_time_aceito', categoria: 'comunidade', icone: '👕', label: 'Convite pro time foi aceito' },
  { id: 'convite_time_recusado', categoria: 'comunidade', icone: '👕', label: 'Convite pro time foi recusado' },
  { id: 'membro_removido_time', categoria: 'urgente', icone: '🚪', label: 'Você foi removido de um time' },
  { id: 'saida_do_time', categoria: 'comunidade', icone: '🚪', label: 'Alguém saiu do seu time' },
  { id: 'capitania_transferida', categoria: 'urgente', icone: '👑', label: 'Capitania de um time foi transferida' },
  { id: 'time_excluido', categoria: 'urgente', icone: '🗑️', label: 'Um time foi excluído' },
];

export const NOTIF_TIPO_POR_ID = Object.fromEntries(NOTIF_TIPOS.map((t) => [t.id, t]));

export function categoriaDe(tipo) {
  return NOTIF_TIPO_POR_ID[tipo]?.categoria || 'comunidade';
}

export function iconeDe(tipo) {
  return NOTIF_TIPO_POR_ID[tipo]?.icone || '🔔';
}
