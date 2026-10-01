-- Rate limit em memória (lib/rateLimit.js) não é compartilhado entre
-- instâncias serverless da Vercel — cada uma tinha sua própria contagem,
-- então o limite real virava "N por instância", não "N no total" (achado
-- na rodada de pentest). Essa tabela + função dão uma contagem
-- compartilhada de verdade, sem precisar de um serviço novo (Redis/KV) —
-- o Supabase já está aqui e já tem acesso total via service role.
create table if not exists rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

alter table rate_limits enable row level security;
-- Sem nenhuma policy: só o service role (usado só dentro de
-- checkRateLimit, nunca exposto a cliente nenhum) lê/escreve aqui.

-- "for update" na linha da chave serializa chamadas concorrentes pra MESMA
-- chave (mesmo IP/usuário tentando a mesma ação ao mesmo tempo) — sem
-- isso, duas requisições simultâneas no limiar do limite poderiam ler a
-- mesma contagem antes de incrementar e as duas passarem, furando o
-- limite por uma unidade. Mesmo raciocínio já usado em
-- aprovar_confirmacao/vincular_time_pelada.
create or replace function check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
as $$
declare
  v_row rate_limits%rowtype;
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 0, now())
  on conflict (key) do nothing;

  select * into v_row from rate_limits where key = p_key for update;

  if now() - v_row.window_start > (p_window_seconds || ' seconds')::interval then
    update rate_limits set count = 1, window_start = now() where key = p_key;
    return true;
  end if;

  if v_row.count >= p_limit then
    return false;
  end if;

  update rate_limits set count = count + 1 where key = p_key;
  return true;
end;
$$;

revoke execute on function check_rate_limit(text, int, int) from public, anon, authenticated;
