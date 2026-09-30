-- Integridade de dados, achados da auditoria de defesa em camadas.

-- (1) Campos de dinheiro/capacidade sem constraint de positividade — nada
-- impedia um bug de aplicação gravar vagas_totais <= 0 (pelada "lotada" na
-- hora de criar, ou dividindo por zero em algum cálculo de ocupação) ou um
-- valor negativo. Confirmado antes de aplicar: nenhuma linha existente
-- viola essas condições.
alter table games add constraint games_vagas_totais_positivo check (vagas_totais > 0);
alter table games add constraint games_valor_nao_negativo check (valor is null or valor >= 0);
alter table mensalidades add constraint mensalidades_valor_nao_negativo check (valor >= 0);
alter table times add constraint times_mensalidade_valor_nao_negativo check (mensalidade_valor is null or mensalidade_valor >= 0);

-- (2) A tabela profiles ainda tinha a policy original de select `using
-- (true)` (006) — hoje sem efeito nenhum porque o GRANT SELECT na tabela
-- foi revogado de anon/authenticated (061, view profiles_publico faz a
-- leitura mascarada). Mas a policy continua lá, morta: se um dia alguém
-- rodar `grant select on profiles to anon` sem lembrar da view, essa
-- policy "acorda" sozinha e reabre o vazamento que a 061 fechou. Remove
-- de vez — sem policy de select nenhuma, RLS nega leitura por padrão
-- mesmo que o GRANT volte por engano.
drop policy if exists "perfis são públicos para leitura" on profiles;
