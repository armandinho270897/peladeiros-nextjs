-- confirmacoes.status ainda carregava o default original 'confirmado',
-- valor que a constraint atual (desde a migration 009) não aceita mais.
alter table confirmacoes alter column status set default 'pendente';
