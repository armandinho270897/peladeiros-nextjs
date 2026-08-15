-- Substitui o campo único "posicao" por modalidade principal + até 2
-- posições dessa modalidade. Mantém o mesmo espírito de "tudo opcional"
-- dos outros campos de perfil: se a pessoa não informar nada, os dois
-- campos ficam nulos juntos; se informar modalidade, precisa de 1-2
-- posições válidas pra ela.

alter table profiles add column if not exists modalidade_principal text;
alter table profiles drop constraint if exists profiles_modalidade_check;
alter table profiles add constraint profiles_modalidade_check
  check (modalidade_principal is null or modalidade_principal in (
    'futebol_campo', 'society', 'futsal', 'futebol_areia', 'futebol_5', 'futebol_8_9'
  ));

alter table profiles add column if not exists posicoes text[];

alter table profiles drop constraint if exists profiles_modalidade_posicoes_par_check;
alter table profiles add constraint profiles_modalidade_posicoes_par_check
  check ((modalidade_principal is null) = (posicoes is null));

alter table profiles drop constraint if exists profiles_posicoes_qtd_check;
alter table profiles add constraint profiles_posicoes_qtd_check
  check (posicoes is null or array_length(posicoes, 1) between 1 and 2);

-- Função de validação: cada posição enviada precisa pertencer à lista da
-- modalidade escolhida (evita salvar "fixo" — posição de futsal — junto
-- com modalidade "futebol_campo", por exemplo). Lista replicada aqui a
-- partir de lib/gameUtils.js (POSICOES_POR_MODALIDADE) — dá defesa em
-- profundidade contra chamadas diretas à API do Supabase que pulem a
-- validação do formulário.
create or replace function posicoes_validas_para_modalidade(modalidade text, posicoes text[])
returns boolean
language sql
immutable
as $$
  select posicoes is null or modalidade is null or posicoes <@ (
    case modalidade
      when 'futebol_campo' then array['goleiro','zagueiro','lateral_direito','lateral_esquerdo','libero','volante','meia_direita','meia_esquerda','meia_central','meia_atacante','ponta_direita','ponta_esquerda','segundo_atacante','centroavante','falso_9']
      when 'society' then array['goleiro','zagueiro','lateral','ala','volante','meia','meia_atacante','ponta','atacante','centroavante']
      when 'futsal' then array['goleiro','goleiro_linha','fixo','ala_direito','ala_esquerdo','pivo']
      when 'futebol_areia' then array['goleiro','defensor','meio_campista','atacante']
      when 'futebol_5' then array['goleiro','defensor','ala','pivo']
      when 'futebol_8_9' then array['goleiro','zagueiro','lateral_direito','lateral_esquerdo','volante','meia','meia_atacante','ponta_direita','ponta_esquerda','atacante','centroavante']
      else array[]::text[]
    end
  )
$$;

alter table profiles drop constraint if exists profiles_posicoes_validas_check;
alter table profiles add constraint profiles_posicoes_validas_check
  check (posicoes_validas_para_modalidade(modalidade_principal, posicoes));

-- Campo antigo (posição única) substituído pelos dois de cima. Nada no
-- código volta a ler "posicao" depois desta migration (EscalacaoField,
-- lib/ratings.js e ManageModal foram todos atualizados no mesmo commit).
alter table profiles drop column if exists posicao;

-- Mensagem opcional do jogador ao solicitar presença, e resposta opcional
-- do capitão ao aprovar/rejeitar — reaproveita o padrão de texto livre já
-- usado em confirmacoes (nome/whatsapp/bairro são "snapshot" da hora do
-- pedido). Limite de 200 caracteres pra não virar campo de texto longo
-- dentro de uma notificação.
alter table confirmacoes add column if not exists mensagem text;
alter table confirmacoes drop constraint if exists confirmacoes_mensagem_tamanho_check;
alter table confirmacoes add constraint confirmacoes_mensagem_tamanho_check
  check (mensagem is null or char_length(mensagem) <= 200);
