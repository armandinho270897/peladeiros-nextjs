-- games_vagas_totais_positivo (065) duplicava games_vagas_totais_check,
-- que já existia na tabela antes de qualquer migration (criada direto no
-- Studio, junto com a própria tabela games) — as duas checam exatamente
-- `vagas_totais > 0`. Confirmado via pg_constraint depois de aplicar a 065.
alter table games drop constraint games_vagas_totais_positivo;
