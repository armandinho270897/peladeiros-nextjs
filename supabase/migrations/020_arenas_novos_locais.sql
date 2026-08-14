-- Peladeiros — novos locais reais de futebol pesquisados na região do Anjo
-- da Guarda e bairros próximos (São Luís-MA). Cada um foi pesquisado
-- individualmente (nome + bairro + referência) antes de entrar aqui — ver
-- auditoria da tarefa pra fonte de cada um. Coordenadas ficam null quando
-- não foi possível confirmar visualmente o ponto exato do campo/arena
-- (rua inteira != o campo em si) — ficam pendentes de confirmação manual,
-- por exemplo usando o próprio "Cadastrar arena" do app pra marcar o pino
-- no mapa depois de alguém confirmar o local pessoalmente.

-- Indicação de acesso (público/privado/não confirmado) — só quando dá pra
-- confirmar a informação; null = nenhuma pesquisa feita sobre isso ainda
-- (caso dos 5 registros que já existiam antes desta tarefa).
alter table arenas add column if not exists acesso text;
alter table arenas drop constraint if exists arenas_acesso_check;
alter table arenas add constraint arenas_acesso_check
  check (acesso is null or acesso in ('publico', 'privado', 'nao_confirmado'));

-- "WS" (migration 004_seed_arenas.sql) já é o mesmo local pedido como
-- "Arena WS" — mesmo endereço exato (Rua da Juçara, 2, Anjo da Guarda) e
-- coordenadas já confirmadas visualmente (migration 005). Renomeia em vez
-- de duplicar.
update arenas set nome = 'Arena WS' where nome = 'WS';

insert into arenas (nome, endereco, bairro, tipo, acesso) values
('Arena MS10', 'Rua Quatorze, 42', 'Vila Embratel', 'arena', 'nao_confirmado'),
('Campo da Piçarrinha', 'Av. João Figueiredo, em frente à Praça 1º de Maio', 'Vila Embratel', 'campo', 'nao_confirmado'),
('Estádio Guioberto Alves', 'Rua Zâmbia', 'Fumacê', 'estádio', 'nao_confirmado'),
('Arena Sítio RC', 'Rua São Mateus', 'Vila Nova', 'arena', 'nao_confirmado'),
('Campo Cardozão', 'Bairro Sá Viana — endereço não confirmado', 'Sá Viana', 'campo', 'nao_confirmado');
