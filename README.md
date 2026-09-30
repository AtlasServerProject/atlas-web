# Atlas Cobblemon — website

Frontend Angular do Atlas, com home, guia de entrada, novidades e loja em preparação. Identidade verde Emerald, navegação compartilhada, layouts responsivos e suporte a redução de movimento.

## Desenvolvimento

Node.js compatível com o projeto e dependências via `npm ci`. Execute `npm start` para desenvolvimento e `npm run build` para gerar `dist/atlas-web/browser`.

Na VM, `atlas-web.service` (serviço do usuário) serve o build na porta 4200. Após mudanças, gere novamente o build; o servidor lê os arquivos compilados. Acesso pela rede da VM: http://192.168.227.129:4200.

## Conteúdo

- `/`: apresentação do Emerald, recursos disponíveis e comunidade.
- `/how-to-play`: orientações para testers e perguntas frequentes.
- `/notices`: progresso real do projeto, sem data prometida de abertura.
- `/store`: preparação da loja, sem catálogo fictício ou pagamentos.

Convite oficial do Discord nos links de comunidade. Endereço Minecraft e download público omitidos até definição. Não há API de status no frontend, checkout ou autenticação. A imagem de capa existente é ilustrativa, não uma captura documentada do lobby.

Próximas validações: revisão visual no navegador desktop/celular, distribuição do modpack e conteúdo final. HTTPS já está ativo no Netlify; domínio próprio é opcional. A compilação não substitui esses testes.

## Netlify

Configuração em netlify.toml para o repositório atlas-web: `npm run build`, saída `dist/atlas-web/browser`, Node 24.21.0. `public/_redirects` preserva as rotas Angular em acessos diretos. Não fornecer credenciais do Discord ou Minecraft ao build.

Para publicar via CLI autenticada: `npx netlify-cli login`, depois `npx netlify-cli deploy --prod --dir=dist/atlas-web/browser --no-build` após compilar. A primeira publicação pode exigir criar/vincular o projeto na conta Netlify. Alternativa: enviar o conteúdo compilado pelo Netlify Drop. O deploy estático permanece disponível mesmo com a VM desligada; isso não hospeda Minecraft nem Atlas-bot.

### Publicação ativa

Produção: https://atlas-cobblemon.netlify.app — publicada em 30/09/2026 por deploy manual do build local, incluindo os nove prints dos kits. Rotas início, loja, como jogar e notícias e nove imagens verificadas via HTTPS. Não há deploy automático por Git configurado; novas alterações exigem build e deploy. O endereço público do site não é o endereço de conexão Minecraft.

## Loja VIP

VIP 1: R$ 25,00; VIP 2: R$ 35,00; VIP 3: R$ 50,00. Valores por 30 dias, sem renovação automática, sujeitos a alteração até a abertura das vendas. Kits incluídos, sem venda avulsa. Caixas serão separadas futuramente. Nove prints originais e ampliação em dialog nativo. Catálogo em pré-lançamento: pagamento e ativação ainda indisponíveis. Especificação comercial em atlas-docs/LOJA.md.
