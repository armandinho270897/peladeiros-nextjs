# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Registra entregas relevantes já disponíveis pra quem usa o app — não todo ajuste visual pequeno.

O projeto não usava número de versão até este documento existir. A retrospectiva abaixo resume o que já está em produção, agrupado por área, sem tentar reconstruir uma linha do tempo exata. Daqui pra frente, cada entrega relevante ganha uma seção nova com versão (ver [Releases](#releases)).

## [Não lançado]

### Adicionado
- Painel de Administração (`/admin`): visão geral, aprovação de arenas, denúncias, moderação de usuário, pausa/cancelamento de pelada, avisos gerais, auditoria e configurações globais.
- Lembrete automático pro organizador que ainda não encerrou uma partida já realizada.
- Distância até a pelada, exibida também na página de detalhe (antes só aparecia na lista).
- Entrar num time por link, sem precisar já ter conta — cadastro novo volta automaticamente pro time e já manda o pedido.
- Tela de "sem conexão" própria no app instalado — troca o erro feio do navegador quando o sinal cai; os arquivos do app carregam do cache, agilizando reaberturas.
- Aviso de "abre no navegador" também aparece pra quem entra pela webview do app do Google (antes só cobria Instagram, Facebook, TikTok etc).
- Tela de abertura própria no iPhone quando o app está instalado (antes só o Android tinha).
- Desfazer gol no Desafiado (botão −1), pra corrigir toque errado no placar ao vivo.
- Modo Desafiado: sorteio de times pra jogo na hora, com fila giratória, cronômetro por partida e desempate por prorrogação, pênaltis ou cara-ou-coroa.

### Corrigido
- Faltas por cancelamento tardio, mês da mensalidade e "hoje" no servidor agora seguem o horário de Brasília (antes a virada acontecia 3h cedo).
- Modo Desafiado e desafios entre times: duplo clique não conta vitória, gol ou aceite em dobro.
- Mensagem de "esqueci minha senha" agora avisa sobre o bloqueio de segurança do Supabase (pedido repetido rápido demais) em vez de sugerir tentar de novo na hora.
- Cadastro novo com destino numa rota pública (ex: um link de convite) agora sempre passa por completar o perfil antes de chegar lá.

## Retrospectiva (entregas já em produção)

### Adicionado
- Descoberta de pelada com mapa, filtro por bairro/modalidade/distância e recomendação com motivo explicado.
- Confirmação em duas etapas (aprovação do organizador + confirmação de vaga com prazo), lista de espera com promoção automática e check-in no dia da partida.
- Perfil com histórico, avaliação por nota e fair play, pontuação de moral, patentes e conquistas por marco.
- Painel do Organizador por pelada, com montagem de times e encerramento de partida com placar.
- Times permanentes, com elenco, convite, e desafios entre times.
- Pagamento por partida e cobrança de mensalidade de time.
- Chat dentro da pelada e central de notificações.
- Lembretes automáticos de partida próxima (24h e 3h antes).
- Aplicativo instalável (PWA).

### Alterado
- Navegação inferior redesenhada para uma barra fixa de ordem estável.
- Cálculo de moral passou a considerar pontualidade e fair play, além de nota e presença.

### Corrigido
- Vazamento de WhatsApp de participantes confirmados em respostas públicas da API.
- Valor padrão inválido na coluna de status de confirmação.

## Releases

Cada release relevante deve ter, na página de [Releases](https://github.com/armandinho270897/peladeiros-nextjs/releases) do GitHub:

- **Versão** — `vMAIOR.MENOR.PATCH`.
- **Resumo de impacto** — o que muda pra quem usa o app, em linguagem direta.
- **Link para o deploy** — [peladeiros-nextjs.vercel.app](https://peladeiros-nextjs.vercel.app).

Releases não são publicadas automaticamente.
