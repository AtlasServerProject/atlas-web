# Atlas Cobblemon — website

Frontend Angular do Atlas, com home, guia de entrada, novidades e loja em preparação. Identidade verde Emerald, navegação compartilhada, layouts responsivos e suporte a redução de movimento.

## Desenvolvimento

Node.js compatível com o projeto e dependências via `npm ci`. Execute `npm start` para desenvolvimento e `npm run build` para gerar `dist/atlas-web/browser`.

Na VM, `atlas-web.service` (serviço do usuário) serve o build na porta 4200. Após mudanças, gere novamente o build; o servidor lê os arquivos compilados. Acesso pela rede da VM: http://192.168.227.129:4200.

## Conteúdo

- `/`: apresentação do Emerald, recursos disponíveis e comunidade.
- `/how-to-play`: orientações para testers e perguntas frequentes.
- `/notices`: progresso real do projeto, sem data prometida de abertura.
- `/store` e `/loja`: catálogo demonstrativo e conteúdo original dos kits, sem pagamentos reais.

Convite oficial do Discord nos links de comunidade. Endereço Minecraft e download público omitidos até definição. Não há API de status ou checkout real. A autenticação usa a API M2; a loja ainda usa services mockados. A imagem de capa existente é ilustrativa, não uma captura documentada do lobby.

Layout e interações validados em Chromium nas larguras 1920, 1440, 1366, 1024, 768, 430, 390 e 360 px. Safari/Firefox e aparelhos reais ainda precisam de validação. Distribuição do modpack e conteúdo final permanecem pendentes.

## Netlify

Configuração em netlify.toml para o repositório atlas-web: `npm run build`, saída `dist/atlas-web/browser`, Node 24.21.0. `public/_redirects` preserva as rotas Angular em acessos diretos. Não fornecer credenciais do Discord ou Minecraft ao build.

Para publicar via CLI autenticada: `npx netlify-cli login`, depois `npx netlify-cli deploy --prod --dir=dist/atlas-web/browser --no-build` após compilar. A primeira publicação pode exigir criar/vincular o projeto na conta Netlify. Alternativa: enviar o conteúdo compilado pelo Netlify Drop. O deploy estático permanece disponível mesmo com a VM desligada; isso não hospeda Minecraft nem Atlas-bot.

### Publicação ativa

Produção: https://atlas-cobblemon.netlify.app. Deploy manual do build compilado; integração automática por Git ainda não configurada. Novas alterações exigem build e deploy. Registro da publicação e validação em `atlas-docs/ATLAS-WEB.md`. O endereço público do site não é o endereço de conexão Minecraft.

## Loja VIP

VIP 1: R$ 25,00; VIP 2: R$ 35,00; VIP 3: R$ 50,00. Valores por 30 dias, sem renovação automática, sujeitos a alteração até a abertura das vendas. Kits incluídos, sem venda avulsa. Chaves serão produtos separados futuramente. Nove prints originais e ampliação em dialog nativo. Catálogo em pré-lançamento: pagamento e ativação ainda indisponíveis. Especificação comercial em atlas-docs/LOJA.md.

## Interface e configuração pública

Hero em tela cheia, navegação fixa, menu mobile, modal de acesso, animações de entrada por IntersectionObserver e parallax discreto no desktop. Componentes compartilhados em `src/app/shared/`. Movimento reduzido é respeitado; diálogos mantêm o foco e fecham por Escape.

`public/site-settings.json` contém apenas dados públicos:

- `serverAddress`: endereço Minecraft confirmado, ou `null`. Sem endereço, o modal orienta o acesso pelo guia/Discord; com endereço, habilita a cópia.
- `heroVideo`: caminho local como `/media/atlas-hero.webm` ou `/media/atlas-hero.mp4`, ou `null`. Adicione o arquivo em `public/media/` antes de configurar. Atualmente não há vídeo real fornecido: a imagem existente é o fallback ativo.

Vídeo configurado toca sem áudio, em loop, com controle de pausa. Pausa fora da tela/aba; falhas, economia de dados e movimento reduzido usam a imagem. Nenhuma biblioteca de animação adicional foi introduzida.

## Testes

Compile com `npm run build` e execute `python3 scripts/verify-local.py --web-tests` em atlas-api para a suíte integrada com banco/API/proxy/contas temporárias. `npm run test:e2e` isolado exige a fixture privada gerada por esse verificador. Na primeira execução instale o navegador com `npx playwright install chromium`. Para outra prévia use `ATLAS_TEST_URL`. A suíte contém 32 testes, incluindo quatro rotas originais e as novas telas de comércio nas oito larguras, autenticação, promoções, foco, menu, modal, cópia, kits, animações e fallback/vídeo temporário de teste.

Após atualizações compatíveis, a auditoria npm ainda reporta 10 alertas em dependências Angular/toolchain, incluindo severidades alta e crítica. A remediação continua pendente e deve ser validada antes de adicionar autenticação/pagamento; não considerar a auditoria limpa.

Especificação da integração comercial futura: `atlas-docs/LOJA-BACKEND.md`.


## Conta, loja e administração (demonstração frontend)

Angular 22 standalone, Angular Router, signals e observables RxJS. A loja agrupa caixas/chaves na categoria Chaves e exibe apenas os cards detalhados quando VIPs está selecionado. A navbar única e os tokens Emerald foram estendidos; home, guia, novidades, comparação VIP, preços iniciais e nove imagens de kits foram preservados.

Rotas: `/login`, `/cadastro`, `/conta`, `/minhas-compras`, `/loja` (também `/store`) e `/admin`. A prévia local já aceita acesso direto a todas essas URLs.

Não existem contas/senhas de desenvolvimento no frontend. Cadastro/login/logout, confirmação de email e recuperação usam HttpClient e sessões HttpOnly persistidas no PostgreSQL. A identidade é restaurada exclusivamente por GET me, nunca pelo armazenamento do navegador. Cadastro não entra automaticamente: mostra orientação para confirmar o email e fazer login.

Rotas adicionais: `/verificar-email`, `/recuperar-senha`, `/redefinir-senha`. Links usam fragmento `#token=`, removido da URL pela tela. O modo administrativo guarda apenas uma preferência visual por UUID na aba e só funciona para ADMIN retornado pela API; é desligado no login/logout.

Para desenvolvimento, `npm start` usa proxy para a API em 127.0.0.1:8080. A prévia compilada `infra/scripts/serve-web.py` também encaminha `/api/v1/` para a API local. No site público, quando a API HTTPS ainda não estiver disponível, as telas mostram a indisponibilidade e não solicitam senhas. O restante da interface continua acessível; habilitar contas reais depende da conexão com a API pública.

ADMIN pode ativar Modo Admin no dropdown desktop ou menu mobile. Na loja, controles de preço e promoção só aparecem com esse modo ativo. `/admin` exige perfil ADMIN, independentemente do modo. Os formulários permitem editar preços e criar/editar ofertas por porcentagem ou preço final, com datas locais do navegador, validação e prevenção de intervalos sobrepostos para o mesmo produto. Promoções podem ser encerradas ou canceladas com confirmação. Um único ClockService atualiza todos os contadores e estados; ofertas agendadas ativam automaticamente e ofertas encerradas retornam ao preço normal do produto. Alterar o preço base não altera o valor já definido em uma promoção.

Comprar abre uma confirmação de **simulação**, sem pagamento ou entrega. Minhas compras mostra apenas pedidos do usuário atual. Vincular Minecraft fornece feedback sobre a integração futura.

### Contratos para Spring Boot

Componentes acessam AuthService, ProductService, PromotionService e OrderService. Os mocks ficam em `core/mock-data.ts` e nos services; AuthService já está integrado; substituir os services comerciais mantendo o contrato público nos próximos marcos.

| Service | Endpoints implementados (Auth) / futuros (comércio) |
| --- | --- |
| AuthService | POST `/api/v1/auth/login`, POST `/api/v1/auth/register`, GET `/api/v1/users/me` |
| ProductService | GET `/api/v1/products`, GET `/api/v1/admin/products`, PATCH `/api/v1/admin/products/{id}/price` |
| OrderService | GET `/api/v1/orders/mine` |
| PromotionService | GET `/api/v1/admin/promotions`, POST `/api/v1/admin/promotions`, PATCH `/api/v1/admin/promotions/{id}`, POST `/api/v1/admin/promotions/{id}/cancel` |

**Os guards e a ocultação de controles são somente UX.** O backend deverá validar a role, proteger endpoints ADMIN, validar promoções e determinar o tempo e o preço vigentes. Checkout jamais deve confiar em preço enviado pelo navegador. Autenticação/roles vêm da API; os dados e ações comerciais simulados não oferecem autoridade comercial.

A suíte de comércio cobre login USER/ADMIN, erro de login, logout, cadastro, sessão, guards, edição de preço, criação/edição/ativação/encerramento/cancelamento de promoções, countdown, compras demonstrativas, foco e Escape. Verifica as novas telas e modais nas oito larguras solicitadas; os testes existentes cobrem a navegação e os kits originais. Validação em Chromium; outros navegadores e dispositivos reais permanecem fora desta execução.
