# Notas públicas do Atlas

A página `/notices` apresenta resumos editoriais da documentação do servidor,
com foco no que muda para jogadores. Dados em
`src/app/pages/notices/patch-notes.ts`; layout no componente da página.

## Referência desta revisão

- Revisão editorial: 06/10/2026.
- Fonte: https://github.com/AtlasServerProject/atlas-docs
- Commit consultado: `8badf7b00e12d1f6fbc17c0d504d6816adec37fa`.
- Última versão localizada: Core 1.30.3, de 04/10/2026.
- O STATUS.md consolida 29/09 e está atrás das notas 1.30.x; para novas
  entregas, usar notas de versão e documentos dos marcos mais recentes.
- NPCS.md ainda registra o NPC Survival como planejado; removida a afirmação
  antiga de que seu acesso já estava implementado da página de novidades.

## Como continuar

1. Atualizar a cópia de atlas-docs e conferir notas novas, guias e pendências.
2. Adicionar registros no início do array, com versão, data original,
   categoria, resumo e impacto para o jogador.
3. Registrar limitações de validação e distinguir implementação de abertura
   pública. Não anunciar pagamentos liberados sem confirmação documental.
4. Vincular cada registro aos documentos consultados por commit, preservando
   as fontes históricas. Resumos da base não devem parecer novas releases.
5. Manter fora do conteúdo público credenciais, endereços internos,
   operações administrativas e detalhes de infraestrutura.
6. Atualizar a data de consulta e a versão no cabeçalho da página.
7. Compilar e conferir filtros, links e layout desktop/mobile.

O conteúdo é versionado e atualizado editorialmente; não existe sincronização
automática com GitHub nesta implementação.

## Compartilhamento no Discord

`npm run updates:export` gera `public/updates.json` da mesma fonte TypeScript.
Os hooks `prestart` e `prebuild` também executam a exportação. Depois de editar
as notas com um servidor de desenvolvimento já ativo, execute a exportação
novamente para atualizar o feed local. O build de produção inclui o feed.

Cada título de nota tem um ID estável para links como `/notices#vip-kits`.
Não reutilize IDs para notas de releases diferentes: correções de uma nota
mantêm seu ID, novas releases recebem um novo ID.

O Atlas-bot pode consumir o feed HTTPS e publicar no canal de novidades.
A configuração, criação do canal e publicação ainda precisam ser aplicadas
no ambiente ativo; consulte `atlas/atlas-bot/README.md`. Publicar o site e
ativar a sincronização no bot são operações distintas. Não copie credenciais
Discord para o frontend.
