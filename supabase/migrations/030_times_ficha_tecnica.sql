-- Reskin urbano — Fase C: campos novos pra "ficha técnica" pública e pro
-- wizard de criação/edição de time. Aditiva, mesmo padrão de
-- 029_times_completo.sql (estende times, não recria nada).

alter table times
  add column if not exists ano_fundacao int,
  add column if not exists cor_primaria text,
  add column if not exists cor_secundaria text,
  add column if not exists nivel_competitivo text,
  add column if not exists aceita_desafios boolean not null default false,
  add column if not exists faixa_etaria text,
  add column if not exists whatsapp_responsavel text;
