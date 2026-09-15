-- Denúncia de jogador, pelada ou arena. alvo_id não tem FK — alvo_tipo já
-- diz qual tabela olhar (jogador→profiles, pelada→games, arena→arenas), e
-- uma FK condicional exigiria 3 colunas nullable ou uma trigger só pra
-- isso; não vale a complexidade pro benefício de integridade referencial
-- aqui (o admin já valida o alvo na hora de decidir a denúncia).
create table if not exists denuncias (
  id uuid primary key default gen_random_uuid(),
  alvo_tipo text not null check (alvo_tipo in ('jogador', 'pelada', 'arena')),
  alvo_id uuid not null,
  autor_id uuid not null references auth.users(id) on delete cascade,
  motivo text not null check (motivo in (
    'comportamento_abusivo', 'no_show_recorrente', 'informacao_falsa',
    'conteudo_inadequado', 'problema_seguranca', 'outro'
  )),
  descricao text,
  status text not null default 'aberta' check (status in ('aberta', 'em_analise', 'resolvida', 'arquivada')),
  decisao text,
  decidido_por uuid references auth.users(id),
  decidido_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_denuncias_status on denuncias(status);
create index if not exists idx_denuncias_alvo on denuncias(alvo_tipo, alvo_id);

alter table denuncias enable row level security;
-- Sem policy pra anon/authenticated: quem denuncia usa POST /api/denuncias
-- (service role, autor_id vem da sessão validada no servidor); quem decide
-- usa /api/admin/denuncias/** (service role + authorizeAdmin()). Autor nunca
-- aparece em resposta pública — só nas rotas /api/admin/**.
