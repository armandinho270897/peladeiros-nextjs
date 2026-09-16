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

## Pull Requests

Para mudanças maiores (mais de um arquivo com lógica nova, mudança de schema, qualquer coisa que mexe em fluxo de autenticação/pagamento/permissão), abra um Pull Request em vez de commitar direto na branch principal. Descreva:

- **Resumo** — o que mudou e por quê, em poucas frases.
- **Como testar** — passo a passo pra reproduzir e validar.
- **Impacto visual** — print ou descrição do que muda na tela, se for mudança de UI.

## Histórico existente

O histórico de commits já publicado não é reescrito, apagado nem reorganizado (sem `rebase -i`, sem `force-push`, sem amend em commit já publicado). Este guia vale a partir de agora, pra frente.
