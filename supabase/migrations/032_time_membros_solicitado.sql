-- "Pedir pra entrar" num time — hoje só existe convite (capitão chama
-- jogador). Isso adiciona o caminho inverso (jogador pede, capitão
-- aprova/rejeita), usando um status novo pra não confundir com convite
-- pendente (que tem autorização de resposta invertida — lá quem responde
-- é o convidado, aqui quem responde é o capitão).

alter table time_membros drop constraint if exists time_membros_status_check;
alter table time_membros
  add constraint time_membros_status_check check (status in ('pendente', 'aprovado', 'rejeitado', 'solicitado'));
