-- Os 3 buckets de imagem (avatars, arena-fotos, times-escudos) foram
-- criados sem file_size_limit nem allowed_mime_types — avatars e
-- arena-fotos são enviados direto do navegador pro Storage (sem passar por
-- rota /api), então não tinham NENHUMA validação de tamanho/tipo antes de
-- ir pro bucket. O Storage do Supabase valida isso na própria política, o
-- que cobre inclusive os dois buckets que hoje não passam por servidor
-- nenhum. 5MB é generoso pra foto de perfil/escudo/arena sem deixar
-- alguém encher o plano gratuito com um arquivo gigante.
update storage.buckets
  set file_size_limit = 5242880, -- 5MB
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  where id in ('avatars', 'arena-fotos', 'times-escudos');
