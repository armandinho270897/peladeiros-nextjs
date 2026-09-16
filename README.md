# Peladeiros

App pra encontrar, organizar e participar de peladas de futebol/futsal — do convite até o placar final.

**App em produção:** [peladeiros-nextjs.vercel.app](https://peladeiros-nextjs.vercel.app)

## O que o app oferece

**Encontrar e entrar em peladas**
Lista e mapa com filtro por bairro, modalidade e distância, recomendação de peladas com o motivo explicado ("perto de você", "mesma modalidade", "vagas abertas"), pedido de vaga com aprovação do organizador.

**Confirmação, espera e check-in**
Fluxo de duas etapas — o organizador aprova o pedido, o jogador confirma a vaga dentro de um prazo — com promoção automática de quem está na lista de espera quando alguém sai, e check-in no dia da partida com tolerância de atraso.

**Perfil, presença, pontualidade e moral**
Histórico de partidas, nota média recebida, percentuais de presença/pontualidade/fair play, uma pontuação de "moral" que combina tudo isso, patentes e conquistas por marco alcançado (nunca um ranking comparativo entre jogadores).

**Organização de partidas e financeiro**
Painel do organizador por pelada, montagem de times, encerramento de partida com placar, cobrança de mensalidade ou valor por partida, times permanentes com elenco e desafios entre times.

**Administração e segurança**
Painel administrativo separado do painel de organização, com papel de administrador validado no servidor: aprovação de arenas, denúncias de jogador/pelada/arena, moderação de usuário (advertência, suspensão, bloqueio), avisos gerais in-app, auditoria de toda ação administrativa e configurações globais.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + React 18
- [Supabase](https://supabase.com/) — Postgres, Auth, Row Level Security, Storage
- Deploy contínuo na [Vercel](https://vercel.com/)
- Mapas com Leaflet e tiles da Jawg
- E-mail transacional via SMTP do Gmail (nodemailer)
- Monitoramento de erros com Sentry
- Lembrete de 24h via cron nativo da Vercel; lembrete de 3h via GitHub Actions (o plano gratuito da Vercel só libera cron 1x/dia)
- PWA instalável (funciona como app no celular)

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie um projeto gratuito no [Supabase](https://supabase.com/) e rode, em ordem, no SQL Editor: `supabase/schema.sql` e depois cada arquivo de `supabase/migrations/`.
3. Copie `.env.local.example` para `.env.local` e preencha com as chaves do seu projeto.
4. Suba o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Abra `http://localhost:3000`.

## Variáveis de ambiente

Nomes usados pelo projeto (sem valores — veja `.env.local.example`):

| Variável | Obrigatória | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | chave pública, respeita RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | chave de servidor, só usada em rotas `/api` |
| `NEXT_PUBLIC_JAWG_ACCESS_TOKEN` | sim | tiles do mapa |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | sim | envio de e-mail transacional |
| `NEXT_PUBLIC_SENTRY_DSN` | opcional | monitoramento de erros |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | opcional | upload de sourcemap no build |
| `CRON_SECRET` | opcional | autentica as chamadas de cron |

## Estrutura do projeto

```
app/              rotas (App Router) — páginas e app/api/**
app/components/   componentes de UI compartilhados
app/admin/        painel administrativo
lib/              regras de negócio, autorização por rota, integrações
supabase/         schema base + histórico de migrations versionadas
```

## Status do projeto

Em produção, com uso ativo. Já cobre: descoberta e confirmação de pelada, perfil com reputação (moral, presença, pontualidade, fair play), organização financeira, times permanentes com desafios entre times, e um painel de administração completo.

## Próximos passos

- Convite público de time por link (hoje só quem já tem conta consegue pedir entrada)
- Preferências explícitas de recomendação (nível e horário preferido do jogador)
- Lembrete automático pro organizador que esquece de encerrar a partida
