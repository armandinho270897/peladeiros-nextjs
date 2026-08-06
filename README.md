# Peladeiros — Fase 1 (Next.js + Supabase)

Esse projeto substitui o protótipo em artifact por um app de verdade, com link fixo e
banco de dados real, sem custo. A UI e a lógica são as mesmas que já validamos — só
trocou o "onde os dados moram".

## Passo a passo pra colocar no ar (grátis)

### 1. Criar o banco (Supabase)
1. Crie uma conta em https://supabase.com e um novo projeto (grátis).
2. Vá em **SQL Editor** e cole o conteúdo de `supabase/schema.sql`, depois rode.
3. Vá em **Project Settings -> API** e copie a **Project URL** e a **anon public key**.

### 2. Configurar o projeto localmente
1. Copie `.env.local.example` para `.env.local` e cole a URL e a chave do passo anterior.
2. Rode:
   ```
   npm install
   npm run dev
   ```
3. Abra `http://localhost:3000` — o app já deve estar funcionando com o banco real.

### 3. Publicar (Vercel — grátis)
1. Crie uma conta em https://vercel.com (dá pra logar com GitHub).
2. Suba esse projeto pra um repositório no GitHub.
3. No Vercel, clique **New Project**, escolha o repositório.
4. Em **Environment Variables**, adicione as mesmas duas variáveis do `.env.local`.
5. Clique em **Deploy**. Em ~1 minuto você tem um link fixo tipo `peladeiros.vercel.app`.

### Se preferir, use o Claude Code
Esse é o momento certo pra abrir o **Claude Code** (desktop ou terminal) apontando pra essa
pasta — ele consegue rodar `npm install`, testar localmente, criar o repositório Git e
até te guiar no deploy do Vercel interativamente, coisa que eu não consigo fazer daqui
do chat (sem acesso à internet neste ambiente).

## O que já está pronto
- Criar pelada, confirmar presença, fila de espera automática, editar/cancelar com
  código de 4 dígitos, filtro por bairro, compartilhar no WhatsApp, seção "hoje" em
  destaque, perfil salvo no navegador.

## O que muda estruturalmente em relação ao artifact
- Dados ficam em Postgres de verdade (Supabase), não mais em `window.storage`.
- Duas tabelas (`games` e `confirmacoes`) em vez de um JSON único — isso é o que
  permite adicionar perfis de usuário, avaliações e histórico na Fase 2 sem reescrever
  o banco do zero.
- O link passa a ser fixo — resolve o maior bloqueio de growth que tínhamos.

## O que NÃO foi implementado de propósito (Fase 2/3)
- Login de verdade (Supabase Auth) — o PIN de 4 dígitos continua sendo a trava por
  enquanto, mas o schema já foi desenhado pra aceitar `auth.uid()` depois sem migração
  dolorosa.
- Mapa, chat, notificações push, pagamentos — ver o backlog priorizado que já
  conversamos.
