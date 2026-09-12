-- confirmacoes.status ainda carregava o DEFAULT original ('confirmado'),
-- de antes da migration 009 trocar os valores aceitos pelo CHECK. Nenhuma
-- rota real depende do default (todo INSERT já define status
-- explicitamente), mas o valor default ficou inválido pro próprio CHECK
-- da tabela — uma inserção futura que confiasse no default falharia com
-- violação de constraint em vez de nascer como pendente, que é o fluxo
-- real ("toda confirmação nasce pendente", comentário original da 009).
alter table confirmacoes alter column status set default 'pendente';
