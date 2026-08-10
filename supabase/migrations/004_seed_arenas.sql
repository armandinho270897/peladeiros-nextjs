-- Peladeiros — seed inicial de arenas (sem lat/lng ainda; marca no mapa depois)
-- Rode depois de 003_add_arenas.sql.

insert into arenas (nome, endereco, bairro, tipo) values
('Vacaria', 'Rua da Jussara, s/n (ao lado da Arena Gym Club)', 'Gancharia', 'arena'),
('CEMA', 'Rua da Palestina, s/n', 'Anjo da Guarda', 'quadra escolar'),
('Japiaçu', 'Rua Luxemburgo, Quadra 2, s/n', 'Anjo da Guarda', 'quadra escolar'),
('WS', 'Rua da Juçara, 2', 'Anjo da Guarda', 'arena'),
('Y Bacanga', 'Rua Iraque, 76-138', 'Itaqui', 'quadra escolar');
