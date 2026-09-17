# Validação da preparação — 17 de setembro de 2026

Destino preparado: `studio601.fabiodrbarros.cloud`. **Não publicado nem verificado pelo domínio.** O proprietário fará o deploy; não foi dado acesso à VPS.

## Resultados locais

- Next.js 16.3.4: `pnpm build` passou; saída standalone criada. `pnpm exec tsc --noEmit` passou.
- `pnpm test:local`: **11 testes passaram**, incluindo autenticação, CSRF, autorização, catálogo, importações, publicação, concorrência e persistência após reinícios, com bases temporárias.
- ESLint dos ficheiros de implementação novos/alterados passou.
- `docker compose config --quiet` passou. Imagem Linux amd64 construída em Docker Desktop, Node 24.14.0; não foi usada a base local real.
- Primeiro teste Docker passou: UID 1000, healthcheck healthy, site e assets públicos, painel, login/logout, origem HTTPS, cookie Secure/HttpOnly/SameSite=Strict, rejeição de origem errada, escrita de catálogo, Sharp/WebP e persistência de base, sessão e imagem após substituir o container.
- Teste Docker completo com backup/restauro passou: arquivo com o serviço parado, extração para um volume novo, permissões UID 1000, recuperação do catálogo, sessão e bytes da fotografia; `PRAGMA integrity_check` devolveu `ok`. Containers, rede e os dois volumes sintéticos foram removidos no fim. O script shell de backup foi verificado sintaticamente; os comandos de arquivo/restauro equivalentes foram executados no teste Docker.
- `tests/media-browser.mjs` passou com Playwright/Edge: upload/substituição/remoção de fotografia da equipa, três áreas, modalidades, fotos dos espaços, segurança e persistência após reinício; viewports 1440, 390 e 320 px; zero escritas na base real.
- `bash -n scripts/backup.sh` passou.
- `.env`, base SQLite, uploads e backups estão excluídos do Git/contexto Docker. O runtime não leva credenciais nem dados do utilizador.
- Git próprio inicializado nesta pasta; `origin` aponta a `https://github.com/fabiodrbarros/studio_601.git`. O repositório ancestral em `C:/Users/Fabio` e os seus remotes foram preservados. Sem commit, push ou force push.

## Falha preexistente identificada

O teste opcional `tests/browser-check.mjs`, ativado por `STUDIO_PLAYWRIGHT_PATH` no teste local, falha na linha 26: espera `#horarios` visível em todas as áreas específicas, incluindo Wellness. O código público existente (`selectArea` em `public/studio.js`) esconde deliberadamente horários em Wellness, que funciona sob marcação. Esse teste ainda contém seletores de tabela anteriores ao horário atual. Não foi alterado o design nem declarado esse teste como aprovado. O teste de fotografias/admin atual passou independentemente.

## A verificar na VPS

- Disponibilidade de 30601, distribuição/arquitetura, recursos e Docker/Compose existentes.
- Software/rede do proxy ou Tunnel e configuração exclusiva deste hostname.
- Importação da cópia dos dados reais e comparação dos conteúdos e fotografias.
- DNS, certificado, redirecionamento HTTPS e acesso real pelo domínio.
- Login/logout e cookie Secure no navegador através do proxy/Tunnel efetivo, limites de upload e ausência de cache autenticada.
- Operação, backups privados fora da VPS e recuperação na instalação final.

O cookie HTTPS foi testado através de pedidos locais HTTP com a origem pública configurada. Isso valida o comportamento da aplicação, **não** um certificado, DNS ou túnel público.
