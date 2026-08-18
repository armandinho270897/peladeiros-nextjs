-- Quem gerou a notificação (opcional) — permite mostrar a foto de perfil
-- de quem pediu presença ou de quem aprovou/rejeitou, junto da mensagem.
-- Fica null pras notificações sem uma pessoa específica por trás (aviso
-- de prazo, conflito de horário, pelada nova no bairro).
alter table notificacoes add column if not exists ator_user_id uuid references auth.users(id);
