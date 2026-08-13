-- Detalhes opcionais da pelada, usados no passo "Detalhes" do wizard de criação.
alter table games add column if not exists tipo text;
alter table games add column if not exists nivel text;
alter table games add column if not exists valor numeric;
alter table games add column if not exists regras text;
