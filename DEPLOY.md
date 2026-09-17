# Studio 601 — Docker na VPS

Domínio: **https://studio601.fabiodrbarros.cloud**. Origem do código: **https://github.com/fabiodrbarros/studio_601.git**.
O deploy na VPS é executado pelo proprietário. A configuração do proxy/Tunnel ainda não foi identificada; seguir apenas o ramo correspondente à instalação existente. Nenhum acesso à VPS ou alteração Cloudflare foi efetuado nesta preparação.

## Tecnologia e dados

- Next.js **16.3.4**, React 19.2.6, Node **24.14.0**; páginas e APIs no mesmo processo. Build em etapas, saída `standalone`, execução com `node` (UID/GID 1000), sem privilégios. `public`, `.next/static` e migração SQL incluídos na imagem.
- SQLite nativo (`node:sqlite`, WAL), sem servidor de base de dados. Catálogo, contas, sessões e limites de login em `/data/studio601.sqlite`; fotografias WebP em `/data/uploads`, processadas com Sharp. Um único volume `studio601_studio601-data` guarda tudo. Manter uma única réplica.
- Autenticação própria: passwords scrypt, sessões aleatórias guardadas como hashes na base; cookies HttpOnly, SameSite=Strict e Secure em HTTPS; validação da origem em escritas. Não há segredo JWT ou password predefinida a configurar no `.env`.
- APIs: `/api/catalog`, `/api/auth/login`, `/api/auth/logout`, `/api/media` e `/api/media/[filename]`. Admin em `/admin`. `/api/health` verifica acesso ao catálogo e permissões do armazenamento e devolve apenas estado, sem dados privados.
- A aplicação ativa **não depende de Workers, Pages, D1, R2 ou login ChatGPT**. Esses elementos são históricos da exportação e adaptação local anterior. `.openai`, Vite e ferramentas antigas não entram na imagem final; nenhum serviço remoto é apagado. Não há migração D1 nova a executar para os dados locais atuais.
- Google Fonts e tiles OpenStreetMap são pedidos pelo navegador; Leaflet é servido localmente. Links Google Maps, Instagram/Facebook e contactos mantidos. Sem SMTP, pagamentos, reservas automáticas, Redis ou tradução externa.
- Existem dados locais reais em `data/`, incluindo uploads; **não estão no Git nem na imagem**. Seguir a migração abaixo antes de publicar para manter os conteúdos e contas.

Foi consultada a documentação incluída no pacote instalado e a [documentação de output da versão 16.3.4](https://github.com/vercel/next.js/blob/v16.3.4/docs/01-app/03-api-reference/05-config/01-next-config-js/output.mdx). O servidor standalone substitui o lançador `run-local.mjs` apenas no Docker; o desenvolvimento local continua disponível.

## 1. Pré-requisitos e inventário

Na VPS, verificar primeiro, sem parar serviços:

```sh
cat /etc/os-release
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Ports}}'
docker compose ls
sudo ss -ltnp
systemctl is-active nginx caddy apache2 cloudflared
docker network ls
```

Identificar como o Pinto & Pintos é publicado: proxy instalado no host, proxy em Docker (Nginx Proxy Manager, Traefik, Caddy, etc.) ou Cloudflare Tunnel, e onde vive a configuração. Inspecionar os ficheiros/unidade do serviço localmente sem divulgar tokens. Não reinstalar Docker nem substituir configurações existentes.

Se Docker não estiver instalado, seguir o repositório oficial adequado à distribuição. Em **Ubuntu sem Docker**, adicionar o repositório da [documentação oficial Docker](https://docs.docker.com/engine/install/ubuntu/#install-using-the-apt-repository), depois:

```sh
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git curl
sudo systemctl enable --now docker
docker compose version
```

Os comandos seguintes pressupõem um utilizador com acesso ao Docker; usar uma sessão administrativa se necessário. Não executar comandos globais como `docker system prune`, nem parar stacks de outros sites.

## 2. Colocar o código

A pasta `/opt/studio601` é uma sugestão; usar o destino que escolheres. Não clonar sobre uma pasta com conteúdo:

```sh
sudo install -d -o "$USER" -g "$(id -gn)" /opt/studio601
git clone https://github.com/fabiodrbarros/studio_601.git /opt/studio601
cd /opt/studio601
```

Antes de clonar, confirmar que as alterações desta preparação foram enviadas ao GitHub. Esta tarefa configura o remote local, mas não faz commit/push automaticamente. Repositórios privados exigem a tua autenticação Git, fora do código. Nunca incluir `data`, backups, `.env` ou chaves SSH num commit.

## 3. Ambiente, porta e conta

```sh
cp .env.example .env
chmod 600 .env
```

Valores preparados:

```dotenv
APP_ORIGIN=https://studio601.fabiodrbarros.cloud
BIND_ADDRESS=127.0.0.1
PORT=30601
IMAGE_TAG=local
```

`PORT` é a porta **do host**; dentro do container o Next.js ouve HTTP em `0.0.0.0:3000`. `BIND_ADDRESS` controla a interface publicada, não a origem pública. Confirmar disponibilidade **na VPS** com `sudo ss -ltnp 'sport = :30601'` e `docker ps`. Se ocupada, escolher outra porta no `.env` e no upstream do proxy/Tunnel. Não mudar para `0.0.0.0` para resolver acesso entre containers.

`APP_ORIGIN` é obrigatória, sem caminho ou barra final. É usada em tempo de execução para CSRF e cookies Secure. Para testes locais isolados admite HTTP apenas em loopback. `STUDIO_DB_PATH` está fixada no Compose, não necessita de configuração externa.

Não há segredos de aplicação a gerar no `.env`. Para uma instalação nova, gerar uma password de pelo menos 12 caracteres num gestor de passwords (por exemplo 24 bytes aleatórios) e, após o arranque, criar a conta interativamente:

```sh
docker compose exec website node scripts/admin-account.mjs create
# Recuperação/alteração de password, revogando sessões anteriores:
docker compose exec website node scripts/admin-account.mjs password
```

A password não aparece no terminal nem deve ser passada nos argumentos. Se importares a base existente, as contas já são preservadas; não é necessário recriá-las.

## 4. Migrar os dados locais e iniciar

**Antes da primeira publicação:** parar apenas o servidor local deste Studio 601 e quaisquer importadores que escrevam na base. No PowerShell, criar um arquivo privado fora da pasta do código, incluindo todos os ficheiros SQLite/WAL/SHM e uploads:

```powershell
$studioBackup = Join-Path $env:USERPROFILE ('studio601-data-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.tar.gz')
tar -czf $studioBackup -C data .
tar -tzf $studioBackup
# Substituir utilizador e host pelos teus dados:
scp $studioBackup utilizador@host:/caminho/privado/studio601-data.tar.gz
```

Não copiar só o `.sqlite` enquanto existem escritas. Retomar o servidor local apenas depois de concluir o arquivo; após o corte para a VPS, evitar editar as duas cópias em paralelo. Proteger o arquivo, que contém contas e sessões.

Na VPS, construir a imagem, importar para o volume ainda vazio e só depois arrancar:

```sh
docker compose config --quiet
docker compose build
# O diretório privado tem de existir e conter studio601-data.tar.gz.
docker compose run --rm --no-deps --user 0 --cap-add CHOWN --cap-add FOWNER --cap-add DAC_OVERRIDE --entrypoint sh \
  -v /caminho/privado:/backup:ro website -ec '
    test ! -e /data/studio601.sqlite
    tar -xzf /backup/studio601-data.tar.gz -C /data
    chown -R 1000:1000 /data
    chmod -R go-rwx /data
  '
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:30601/api/health
```

Usar apenas arquivos teus, com caminhos relativos à pasta `data`. O helper de manutenção usa root apenas para acertar permissões; a aplicação corre sempre como UID 1000. Para uma instalação deliberadamente vazia, omitir a importação e criar a conta. As tabelas são criadas automaticamente, sem dados de demonstração.

Se houver **outros conteúdos existentes em D1**, fazer primeiro exportação/backup do D1 e comparar o catálogo com a base local; não importar SQL D1 sobre esta base nem apagar o serviço. Essa reconciliação não foi necessária nem executada nesta preparação.

## 5. Cloudflare e encaminhamento: escolher a abordagem existente

DNS/proxy/Tunnel são a camada de acesso público, independentes da base SQLite. Não alterar registos do domínio raiz nem de outros subdomínios. Não adicionar serviços proxy/Tunnel ao Compose sem identificar os existentes.

### A. Cloudflare Tunnel existente no host

No painel Cloudflare, abrir o Tunnel que já liga à VPS e adicionar **apenas** a aplicação publicada `studio601.fabiodrbarros.cloud`, serviço HTTP `http://127.0.0.1:30601`. Guardar o novo hostname; confirmar que o DNS deste hostname aponta ao Tunnel (o assistente costuma criá-lo). Não criar um A para o IP nesse hostname em simultâneo.

Num Tunnel gerido por ficheiro local, acrescentar antes da regra final de fallback, preservando todas as restantes entradas:

```yaml
- hostname: studio601.fabiodrbarros.cloud
  service: http://127.0.0.1:30601
```

Validar com `cloudflared tunnel ingress validate` usando o ficheiro efetivamente instalado; associar só o novo hostname ao Tunnel com `cloudflared tunnel route dns NOME_OU_UUID studio601.fabiodrbarros.cloud`. Aplicar pelo mecanismo existente. Um reinício de um conector partilhado pode afetar outros sites: preferir a configuração remota suportada e não reiniciar serviços partilhados sem uma janela apropriada.

### B. Tunnel ou proxy existente dentro de Docker

`127.0.0.1` dentro do proxy refere-se ao próprio container. Identificar a rede já usada por esse proxy (`docker inspect NOME_DO_PROXY --format '{{json .NetworkSettings.Networks}}'`) e adicionar **apenas website** à mesma rede. Criar `compose.override.yaml` neste projeto:

```yaml
services:
  website:
    networks:
      default: {}
      ingress:
        aliases: [studio601-web]
networks:
  ingress:
    external: true
    name: NOME_REAL_DA_REDE_EXISTENTE
```

`docker compose up -d --build` passa a carregar esse override automaticamente. Upstream no Tunnel/proxy: `http://studio601-web:3000`. A publicação no host continua limitada ao loopback; não é necessário expô-la à Internet. Configurar o novo host no gestor existente (incluindo TLS se for proxy reverso), sem alterar containers ou regras dos outros sites. Guardar uma cópia privada do override juntamente com o `.env` para recuperação.

### C. DNS para IP público + proxy reverso no host

Criar apenas o registo A `studio601` na zona `fabiodrbarros.cloud`, para o IP público da VPS. AAAA apenas se houver IPv6 funcional com o mesmo proxy. Reutilizar a opção de proxy Cloudflare existente.

Se o software identificado for **Nginx**, adicionar um ficheiro exclusivo para este hostname. Usar o bloco preparado em `deploy/nginx-studio601.conf.example` como base: ajustar certificado/porta, testar `sudo nginx -t` e só então `sudo systemctl reload nginx`. O certificado tem de existir antes de ativar o bloco TLS. Obter/renovar pelo mecanismo já utilizado na VPS (ACME ou Cloudflare Origin CA); guardar a chave apenas no servidor. Não substituir `nginx.conf`, configurações default ou ficheiros de outros sites.

Se for **Caddy**, acrescentar somente ao ficheiro já carregado:

```caddyfile
studio601.fabiodrbarros.cloud {
    reverse_proxy 127.0.0.1:30601
}
```

Usar a configuração e mecanismo de certificados da instalação, validar com `caddy validate --config CAMINHO_DO_CADDYFILE` e aplicar o reload existente. Caddy pode obter certificado automaticamente quando os desafios ACME estão acessíveis. Se for outro software, configurar o mesmo hostname/upstream através dele; não instalar Nginx/Caddy em paralelo.

## 6. HTTPS e validação pública

Para DNS + proxy Cloudflare, usar **Full (strict)** com certificado válido no proxy de origem; nunca Flexible. Como a zona serve outros sites, não mudar cegamente o modo global: conservar um modo já adequado ou aplicar a regra específica deste hostname suportada pela conta. Um certificado Origin CA serve a ligação Cloudflare→origem, mas não é de confiança pública em acesso direto.

Com Tunnel, o HTTPS público termina na Cloudflare e a ligação ao conector usa o Tunnel; o serviço local HTTP é adequado. Não é necessário abrir as portas 80/443 para este serviço por Tunnel. Em DNS + proxy, só o proxy deve receber tráfego público, nunca a porta 30601.

No hostname novo, evitar regras de cache que guardem `/admin`, `/api/auth/*`, `/api/catalog*` ou `/api/health`; respeitar `Cache-Control: no-store`. Desativar qualquer cache total herdada para essas rotas sem alterar outros hostnames. Configurar redirecionamento HTTP→HTTPS apenas para este domínio.

```sh
curl -I http://studio601.fabiodrbarros.cloud
curl --fail -I https://studio601.fabiodrbarros.cloud
curl --fail https://studio601.fabiodrbarros.cloud/api/health
curl --fail https://studio601.fabiodrbarros.cloud/api/catalog
```

Esperado: HTTP redireciona para HTTPS, certificado válido sem `-k`, health `{"status":"ok"}`, catálogo público. Abrir o site e `/admin` no navegador: login, editar um texto, carregar fotografia, confirmar no site, reiniciar apenas `website` e confirmar persistência; logout deve bloquear novamente o painel. Confirmar cookie Secure/HttpOnly/SameSite e ausência de cache autenticada. **Só considerar o deploy concluído após estes testes pelo domínio.**

Referências: [publicar aplicações por Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/) e [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).

## 7. Estado e logs

```sh
docker compose ps
docker compose logs --tail=100 website
docker compose logs -f website
docker compose exec website id
curl --fail http://127.0.0.1:30601/api/health
```

Logs rodam em três ficheiros de 10 MB; restart `unless-stopped`. Healthcheck de 30 s com timeout e período inicial. `unhealthy` sinaliza falha, mas o Docker não reinicia um processo vivo apenas por esse estado: consultar logs/disco/permissões antes de intervir. Não imprimir a base, hashes ou cookies nos logs.

## 8. Atualizar preservando dados

```sh
cd /opt/studio601
sh scripts/backup.sh /var/backups/studio601
# Guardar referência e imagem atuais antes de construir por cima de :local.
git rev-parse HEAD > /var/backups/studio601/previous-commit.txt
docker image tag studio601:local studio601:rollback
git status --short
git pull --ff-only
docker compose up -d --build
docker compose ps
```

Resolver alterações locais sem as sobrescrever se `git pull` não puder avançar. Se usares outro `IMAGE_TAG`, adaptar a tag da imagem acima. O volume mantém-se: não executar `down -v`, `volume prune` ou apagar `/data`. Confirmar health e os testes do domínio após cada atualização. Guardar `.env`, override, configuração exclusiva do proxy e referência do commit num local privado, fora do Git.

## 9. Backup e restauro

`sh scripts/backup.sh /var/backups/studio601` para apenas `website` durante a cópia e volta a iniciá-lo mesmo se a cópia falhar. Arquiva a base, WAL/SHM e uploads juntos. Copiar o arquivo para armazenamento privado fora da VPS, idealmente cifrado, e testar a restauração. O diretório pode requerer preparação com permissões pelo administrador.

Para restaurar sem sobrescrever o volume anterior, parar `website`, criar um **volume novo exclusivo** e importar o backup. Guardar primeiro outro backup do estado atual. Exemplo de nome (escolher um novo em cada restauro):

```sh
docker compose stop website
docker volume create studio601-data-restored-20260917
```

Criar `compose.restore.yaml`:

```yaml
volumes:
  studio601-data:
    external: true
    name: studio601-data-restored-20260917
```

Importar o arquivo escolhido (substituir o nome real):

```sh
docker compose -f compose.yaml -f compose.restore.yaml run --rm --no-deps \
  --user 0 --cap-add CHOWN --cap-add FOWNER --cap-add DAC_OVERRIDE --entrypoint sh -v /var/backups/studio601:/backup:ro website -ec '
    test ! -e /data/studio601.sqlite
    tar -xzf /backup/ARQUIVO_ESCOLHIDO.tar.gz -C /data
    chown -R 1000:1000 /data
    chmod -R go-rwx /data
  '
docker compose -f compose.yaml -f compose.restore.yaml run --rm --no-deps \
  --entrypoint node website --input-type=module -e '
    import { DatabaseSync } from "node:sqlite";
    const db = new DatabaseSync("/data/studio601.sqlite");
    const result = db.prepare("PRAGMA integrity_check").get();
    console.log(result);
    if (Object.values(result)[0] !== "ok") process.exit(1);
    db.close();
  '
```

Depois de `ok`, integrar a secção `volumes` de `compose.restore.yaml` em `compose.override.yaml`, preservando eventuais redes já lá existentes. Assim o comando habitual `docker compose up -d --build` usa permanentemente o volume restaurado. Confirmar volume montado com `docker inspect "$(docker compose ps -q website)" --format '{{json .Mounts}}'`, login e fotos antes de apagar qualquer cópia antiga. Não apagar automaticamente o volume anterior. Um restore antigo recupera também sessões antigas; alterar a password se for necessário revogá-las.

## 10. Reverter atualização

Se a atualização falhar e a base continuar compatível, criar temporariamente `compose.rollback.yaml`:

```yaml
services:
  website:
    image: studio601:rollback
```

```sh
# Incluir também -f compose.override.yaml se existir (rede/volume restaurado).
docker compose -f compose.yaml -f compose.rollback.yaml up -d --no-build website
```

Não reconstruir a tag de rollback. Manter o mesmo volume para preservar alterações recentes. Se a versão nova fez alterações incompatíveis aos dados, restaurar o backup pré-atualização para outro volume conforme a secção 9, reconhecendo que escritas posteriores ao backup não estarão nessa cópia. Recuperar o código correspondente ao commit guardado numa pasta separada, sem `reset --hard`, antes de retomar builds normais. Validar novamente o domínio.

## Validação local

Com Node 24.14+ e as dependências instaladas:

```sh
pnpm build
pnpm exec tsc --noEmit
pnpm test:local
node --test tests/docker.test.mjs
```

O teste Docker usa projeto e volumes de nome aleatório, porta local 30602 e credenciais temporárias; constrói a imagem, testa o healthcheck, login com origem HTTPS, cookie Secure, APIs, upload Sharp, persistência após recriar o container e backup/restauro para um volume novo com verificação da integridade SQLite. No fim remove apenas os volumes sintéticos desse teste. Nunca usa os dados reais. Requer a porta 30602 livre.

O estado efetivamente observado nesta preparação está em `DEPLOY-VALIDATION.md`. HTTPS real, DNS e ligação ao proxy/Tunnel da VPS permanecem verificações do deploy manual.
