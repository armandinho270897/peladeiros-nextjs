-- Peladeiros — adiciona coordenadas do local (mapa)
-- Já aplicada manualmente no projeto Supabase em uso; arquivo aqui só pra manter
-- o histórico de mudanças do schema documentado.

alter table games add column if not exists latitude numeric;
alter table games add column if not exists longitude numeric;
