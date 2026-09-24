# Contribuindo com o Peladeiros

Guia curto de como entregar mudanças neste repositório.

## Commits

- Um commit por mudança lógica — não misture refatoração com feature nova, nem duas features sem relação no mesmo commit.
- Título em português, no imperativo, claro, até 72 caracteres.
- Corpo é opcional. Quando usar, no máximo três bullets focados em **impacto** (o que muda pra quem usa ou mantém o app), não em diário de investigação.
- Evite: "testado ao vivo", relatos de tentativa e erro, nomes de ferramentas ou modelos usados na implementação, explicações longas de como o código funciona por dentro (isso é assunto de comentário no código, não de commit).
- Não adicione `Co-Authored-By` automaticamente. Autoria real é decisão do mantenedor.

**Bom:**
```
Adiciona painel administrativo
Corrige alinhamento da navegação móvel
Exibe pontualidade no perfil
Ajusta regras de confirmação de presença
```

**Evitar:**
```
fix: tentativa 3 de corrigir o bug do carrossel (testado ao vivo, funcionou)
wip debug temporário
ajustes conforme conversamos
```

## Testes

```bash
npm test
```

Usa o executor nativo do Node, sem dependência extra. Os testes ficam em `tests/` e cobrem regras que já deram problema: horário de Brasília (dia, mês da mensalidade, falta por cancelamento tardio), sorteio dos times do Desafiado e bloqueio de conta suspensa. Regra nova que mexe em data, dinheiro ou reputação deve ganhar um teste.

O script `test` lista os arquivos um por um (não usa `tests/*.test.mjs`) porque a busca por padrão de arquivo do `node --test` não é igual em toda versão do Node — arquivo de teste novo precisa ser adicionado à mão no `package.json`.

Todo push e Pull Request pro `main` roda `npm test` e `npm run build` automaticamente (`.github/workflows/ci.yml`) — não usa nenhuma chave de verdade, só valores fictícios (o build não busca dado nenhum do Supabase durante a compilação).

## Tela de abertura do iPhone

O Safari não gera a splash screen do app instalado sozinho a partir do manifest (diferente do Android) — exige uma imagem PNG por tamanho de tela + densidade de pixel. As imagens ficam versionadas em `public/icons/splash/`, geradas por `node scripts/gerar-splash-ios.mjs` (usa `sharp`, só dependência de desenvolvimento). Rode esse script de novo só se o ícone (`public/icons/icon-512.png`) ou a cor de fundo (`public/manifest.json`, campo `background_color`) mudarem — a lista de tamanhos de tela cobertos fica em `lib/splashIos.js`.

## Service worker (`public/sw.js`)

Escopo de propósito pequeno: cacheia só o build do Next (`_next/static/**`, com hash no nome, seguro pra sempre) e serve `/offline` no lugar do erro do navegador quando uma navegação falha por falta de internet. Nunca toca em `/api/` nem `/auth/` — pelada, chat, placar e confirmação continuam sempre ao vivo, sem risco de mostrar dado velho escondido em cache. Se `/sw.js` ou `/offline` precisarem passar pelo `middleware.js` (ex: nova rota pública), lembre de manter os dois fora da exigência de login — ver `isPublicPath` e o `matcher` no topo do arquivo.

## Operações de várias etapas: função no banco, não sequência em JS

Operação que grava em mais de uma tabela, ou que decide com base num valor lido antes de escrever (contar vagas e aprovar, fechar partida e atualizar os dois times), vai numa função do Postgres chamada por `supabase.rpc(...)` — não numa sequência de chamadas soltas em JS com "desfazer" manual. A função roda numa transação só: se qualquer passo falhar, o banco desfaz tudo sozinho, e `for update` trava a linha certa contra duas requisições simultâneas. Exemplos: `aprovar_confirmacao` (054), `desafiado_encerrar_partida` (055), `desafios_aceitar` (056).

Fica em JS o que não é transação de dados: autorização (quem está pedindo), notificação e e-mail. Erro esperado sai da função como `raise exception` com a mensagem exata que a rota mapeia pro status HTTP, ou como linha com um campo `tipo` quando a rota precisa devolver formatos diferentes.

## Pull Requests

Para mudanças maiores (mais de um arquivo com lógica nova, mudança de schema, qualquer coisa que mexe em fluxo de autenticação/pagamento/permissão), abra um Pull Request em vez de commitar direto na branch principal. Descreva:

- **Resumo** — o que mudou e por quê, em poucas frases.
- **Como testar** — passo a passo pra reproduzir e validar.
- **Impacto visual** — print ou descrição do que muda na tela, se for mudança de UI.

## Histórico existente

O histórico de commits já publicado não é reescrito, apagado nem reorganizado (sem `rebase -i`, sem `force-push`, sem amend em commit já publicado). Este guia vale a partir de agora, pra frente.
