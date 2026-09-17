# Continuar o Studio 601 no Codex

Esta exportação contém o código da versão publicada em 17/09/2026.
Commit: e4cb7fe88ca4913b19149ccbbe22d2af2ad7a1fb

> Atualização local (17/09/2026): a descrição do ambiente abaixo documenta a exportação original. A execução independente no Windows foi adaptada para Next.js/Node.js, SQLite e login próprio. Consultar README.md para arranque, criação da conta, testes e estado atual. Não publicar nem usar os scripts históricos Sites nesta fase.

## Estado e requisitos a preservar
- Uma página com quatro vistas: Studio 601 (entrada), Fitness, Wellness e Dance.
- Studio 601: apresentação, cartões das três áreas, equipa completa e contactos; sem horário conjunto.
- Áreas: apresentação, modalidades/serviços, profissionais e horário ou marcação.
- Fitness preto/branco; Wellness amarelo/dourado; Dance azul, de acordo com os logos.
- Layout inspirado na Bucklerfit: hero grande, navegação flutuante, cartões de modalidades empilhados e equipa em carrossel horizontal.
- Sem emojis. Ícones SVG. Sem imagens IA nem logos inseridos: espaços reservados a substituir com ficheiros reais.
- Admin: modalidades/serviços por área, profissionais com várias áreas, sessões semanais ou pontuais, datas canceladas, rascunho/publicado e contactos.
- Wellness sob marcação; Dance apenas dias com sessões.

## Estrutura
- lib/public-html.ts: HTML da página pública.
- public/studio.css e public/studio.js: visual, navegação e conteúdos públicos.
- app/admin/: painel administrativo.
- app/api/catalog/route.ts: API pública e administrativa.
- lib/catalog.ts: modelo e validação de dados.
- lib/server.ts e app/chatgpt-auth.ts: persistência e autorização.
- db/ e drizzle/: esquema e migração D1.

## O que está incluído
Código completo, package.json, pnpm-lock.yaml, componentes, scripts de projeto e migrações.
Não inclui node_modules, ficheiros compilados, histórico Git, credenciais, segredos ou dados da base de dados em produção. As migrações criam a estrutura; não são uma cópia dos conteúdos inseridos no admin.

## Ambiente atual
React/Vinext/Vite, Cloudflare Workers e D1. A autorização usa identidade fornecida pelo alojamento ChatGPT e ADMIN_EMAILS configurado no servidor. O login atual não funciona automaticamente num servidor independente.
O projeto utiliza pnpm; preservar o lockfile. Os scripts de arranque incluem integração com o ambiente Sites: revê-los antes de executar em Windows ou Docker. Não assumir que basta npm start para migrar.
.openai/hosting.json identifica o Site existente: preservar a identidade caso se continue nesse alojamento. Para VPS, preparar configuração própria sem publicar alterações no Site atual inadvertidamente.

## Pedido sugerido ao Codex
Analisa este projeto existente e o README. Preserva o layout, as quatro vistas, as paletas e todas as funcionalidades. Prepara primeiro a execução local no meu computador e identifica as adaptações necessárias para alojamento independente com Docker. Substitui as dependências específicas de D1 e da autenticação ChatGPT por soluções adequadas ao destino acordado, sem remover autorização do admin. Não confies em cabeçalhos de identidade enviados diretamente pelo cliente. Não redesenhes o site nem inventes conteúdos. Não publiques na VPS nem alteres o alojamento atual sem eu pedir. Mantém os conteúdos existentes caso seja fornecida uma exportação da base de dados.

Caddy é apenas uma opção de reverse proxy/HTTPS para a VPS; não é uma dependência funcional do projeto e não foi incluída uma configuração Caddy.
