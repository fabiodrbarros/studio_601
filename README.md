# Studio 601 — execução local no Windows

Site existente com quatro vistas na mesma página (Studio 601, Fitness, Wellness e Dance) e painel em `/admin`. O layout, as animações e os conteúdos de apresentação foram preservados. Depois da adaptação local foram aplicados os logótipos reais fornecidos e o verde do logo Fitness, conforme pedido; os espaços para fotografias são preenchidos a partir do admin. Não foram geradas imagens nem adicionados emojis.

## Primeiro arranque

Requisitos: Node.js **24.14 ou superior** e pnpm 11. O Node 24.14 e pnpm já estão disponíveis neste computador. O lockfile acompanha as dependências atuais, incluindo Sharp para validar e otimizar as fotografias carregadas.

No PowerShell, dentro desta pasta:

```powershell
cd C:\Users\Fabio\OneDrive\Documentos\studi_601
pnpm install --frozen-lockfile
pnpm admin:create
pnpm build
pnpm start
```

A instalação e o build já foram executados nesta adaptação. Falta escolher a tua conta com `pnpm admin:create`: o comando pede um utilizador (pode ser e-mail) e a password duas vezes. A password não aparece no ecrã e deve ter pelo menos 12 caracteres. Não existe conta/password predefinida, registo público nem login automático. As contas usadas nos testes foram criadas numa base isolada e removidas.

- Site: <http://127.0.0.1:3000/>
- Admin: <http://127.0.0.1:3000/admin>

Mantém esse endereço exato: a proteção de origem recusa pedidos de outro endereço, incluindo `localhost` se estiver configurado `127.0.0.1`. O servidor só escuta no endereço local; esta fase não o disponibiliza na rede.

Nos arranques seguintes basta `pnpm start`. Para terminar, usa Ctrl+C no terminal. Depois de editar código, volta a executar `pnpm build` antes de `pnpm start`. Durante desenvolvimento, podes usar `pnpm dev` em alternativa, no mesmo endereço (não executar ambos ao mesmo tempo).

## Configuração e dados

Não é necessário criar `.env.local` para usar os valores predefinidos. Para mudar a porta ou a localização da base, copia `.env.example` para `.env.local` e ajusta:

```dotenv
APP_ORIGIN=http://127.0.0.1:3000
STUDIO_DB_PATH=./data/studio601.sqlite
```

Por exemplo, para porta 3001, altera `APP_ORIGIN` para `http://127.0.0.1:3001` e reinicia. O arranque e a proteção de origem usam a mesma configuração. Caminhos relativos da base são resolvidos a partir da pasta do projeto; podes usar um caminho absoluto para guardar os dados fora do OneDrive. O comando de criação de conta usa a mesma `.env.local`.

A base SQLite em `data/studio601.sqlite` guarda catálogo, contas, sessões e limitação de tentativas. As tabelas são criadas automaticamente por `db/migrations/0001-local.sql`. O catálogo mantém a estrutura da tabela D1 original e a gravação com versão; conflitos entre janelas devolvem erro e pedem recarregar, sem sobrescrever dados silenciosamente. `pnpm build` e reiniciar o servidor não apagam os dados.

Em Contactos, o admin também permite editar o link HTTPS do Google Maps e a indicação da chamada. O site apresenta a localização num mapa incorporado, um link para abrir o Maps, o telefone clicável e a indicação configurada. O mapa requer Internet e usa o Google Maps sem chave de API no projeto. Foram inseridos na base local a localização e o número fornecidos pelo utilizador; o e-mail e os restantes conteúdos foram preservados.

A exportação não contém os dados de produção. A base começa vazia, sem conteúdos de demonstração. Caso seja fornecida uma exportação D1, a tabela `catalog` pode ser migrada após validar os dados, mantendo os identificadores e a versão. Nenhuma base de produção foi acedida.

Para uma cópia simples de segurança local, para o servidor e copia a pasta `data` inteira para um local seguro; trata-a como privada, porque também contém hashes de passwords e sessões. Não copies apenas um ficheiro SQLite enquanto o servidor escreve: SQLite usa também ficheiros WAL/SHM. Não apagues `data` nem a substituas por uma base de teste.

## Login e segurança

As passwords são guardadas com scrypt, salt aleatório por conta, N=32768/r=8/p=3 e comparação de tempo constante. Não há passwords nem chaves secretas no código. A sessão tem um token aleatório de 256 bits, cujo hash é guardado na base; o cookie tem HttpOnly, SameSite=Strict e validade de oito horas. Secure é ativado quando a origem configurada usa HTTPS; no HTTP local não é aplicado. O arranque desta fase está limitado a HTTP em loopback.

O servidor verifica a sessão tanto na página admin como em toda a leitura administrativa e escrita. Cabeçalhos ChatGPT, identidade e `X-Forwarded-*` não concedem acesso nem permitem contornar o limite de tentativas. Login, logout e gravação exigem a origem configurada. Os corpos JSON têm limites de tamanho. Há um limite persistente de cinco tentativas por utilizador e trinta no total por janela de quinze minutos; as respostas não revelam se uma conta existe. Sair revoga a sessão no servidor.

Para recuperar/alterar uma password, com acesso ao terminal deste computador:

```powershell
pnpm admin:password
```

O comando pede utilizador e nova password, e termina todas as sessões dessa conta. Proteger o acesso ao computador e à base é parte da proteção das contas.

## Gestão preservada

1. Criar modalidades/serviços em cada área.
2. Na gestão das pessoas, criar cada pessoa uma única vez e escolher uma ou várias áreas, sem selecionar modalidades. Esta gestão é independente da seleção de Fitness, Wellness e Dance. As associações já existentes a serviços e sessões são preservadas; para retirar uma área, desassociar primeiro as referências dessa área nas respetivas fichas.
3. Nas modalidades com horário, usar «Horários» para gerir as sessões. A lista «Turmas e sessões» agrupa os horários por modalidade: cada modalidade aparece uma vez e «Adicionar horário» permite acrescentar dias e horas ao mesmo registo. Cada horário mantém o seu profissional, sala, publicação, validade e datas canceladas.
4. Publicar os registos. Modalidade, profissional e sessão precisam de estar publicados para a sessão aparecer.

Wellness funciona sob marcação. Dance apresenta apenas os dias com aulas na semana selecionada. As sessões podem repetir semanalmente (com início/fim opcionais) ou ocorrer numa data específica; datas canceladas são excluídas. Horário em Europe/Lisbon. A API pública expõe apenas registos publicados. Os rascunhos continuam disponíveis apenas no admin autenticado.

Os três cartões da secção “Três áreas. Um Studio.” usam as fotografias fornecidas para Fitness, Wellness e Dance, copiadas sem alterações para `public/photos`. Os logótipos permanecem dentro dos cartões, sobre as imagens. As fotografias das modalidades e dos espaços podem agora ser carregadas no admin. Os quatro logótipos fornecidos (Studio 601, Fitness, Wellness e Dance) estão em `public/logos`, sem alterar os PNG originais. Os logótipos da primeira secção e do rodapé acompanham a área selecionada; os cartões identificam cada área com o respetivo logo. A paleta Fitness usa o verde do logo, `#88C501`, com tons complementares para fundos e contraste; o admin acompanha esta paleta. Wellness e Dance mantêm as suas paletas. Não há pagamentos ou reservas automáticas; os pedidos são encaminhados para o contacto configurado. A fonte pública Manrope mantém a dependência existente do Google Fonts; quando não há Internet, o CSS usa a fonte alternativa existente.

## O que mudou no alojamento

Os comandos ativos usam Next.js, React e Node.js, já incluídos nas dependências, em vez do arranque Vinext/Vite com Workers e Sites. `scripts/run-local.mjs` é multiplataforma e não chama Bash, Wrangler, o ambiente Sites nem comandos de publicação. SQLite local substitui o binding D1. O login ChatGPT foi substituído pelo login próprio; `app/chatgpt-auth.ts` foi removido para evitar reutilizar autenticação baseada em cabeçalhos.

Os ficheiros históricos de Vite/Cloudflare/Sites e as migrações Drizzle permanecem no projeto como referência da exportação, mas não participam no arranque local. `.openai/hosting.json` foi preservado sem alterações. Não usar os scripts históricos de publicação para esta instalação local.

Referências de implementação: [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next) e [SQLite do Node.js](https://nodejs.org/api/sqlite.html). Nesta versão do Node, SQLite ainda emite um aviso de API experimental; o funcionamento foi testado com Node 24.14 neste Windows.

Os links do Instagram e Facebook são editáveis nos Contactos do admin, validados como HTTPS das respetivas redes e apresentados em nova aba no site. O card de localização do Studio usa Leaflet 1.9.4 e mapas OpenStreetMap, com marcador nas coordenadas confirmadas na ficha Google Maps (41.849938, -8.4176481), controlos de zoom e link para abrir no Google Maps. A biblioteca, os estilos, os ícones e a licença estão em `public/vendor/leaflet`, copiados da dependência fixada no package.json; atualizar esta cópia ao mudar a versão. O mapa exige Internet para os tiles, respeita a cache do navegador, mantém a atribuição e usa `referrerPolicy` apenas nas imagens do mapa para enviar a origem exigida pelo serviço. Foi confirmado também no navegador interno do Codex, onde a incorporação Google permanecia vazia. Se alterares a localização do Studio no futuro, será preciso confirmar as novas coordenadas; não são inferidas automaticamente da morada.

Referências do mapa: [Leaflet](https://leafletjs.com/examples/quick-start/) e [política de tiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

O ícone da aba do site e do admin é `public/favicon-studio.png`, uma exportação de 64 × 64 px do símbolo circular do logótipo geral fornecido. O PNG original em `public/logos/studio.png` foi preservado.

O botão de menu do canto superior direito e o respetivo diálogo foram retirados. A barra de navegação mantém as quatro vistas; o admin continua acessível em `/admin`.

A primeira secção ocupa `100svh`, com fundo branco e texto escuro. O logótipo foi movido do topo para o antigo espaço de vídeo/fotografia, mantendo os PNG fornecidos e a mudança de marca conforme a área selecionada. Em mobile, o logótipo fica abaixo do texto dentro da mesma secção.

## Verificação

```powershell
pnpm exec tsc --noEmit
pnpm build
pnpm test:local
```

Os testes usam uma base temporária separada, levantam o build em `127.0.0.1:30601`, reiniciam o servidor e removem a base ao terminar. Não usam a tua base real. Executa `pnpm build` antes dos testes, para testar o código mais recente.

Verificados: autorização, recusa de cabeçalhos falsificados e tokens inventados, origem, dados inválidos, passwords incorretas, expiração, logout, alteração de password, limitação de tentativas, modalidades/serviços, profissionais por área, sessões semanais/pontuais, datas inválidas, rascunhos/publicação, concorrência e persistência de catálogo/contas/sessões/bloqueios após reinícios.

Também foi executado o teste opcional `tests/browser-check.mjs` em Microsoft Edge, com Playwright já disponível no ambiente: navegação nas quatro vistas, detalhes, Wellness sob marcação, Dance só com dias de aulas, exclusão de datas canceladas, login/logout, criação/edição/publicação/eliminação, profissionais com várias áreas, formulários de sessões semanais/pontuais e contactos. Foram testadas larguras de 1440, 768 e 390 px, incluindo admin autenticado, sem overflow da página nem erros JavaScript. Para repetir com uma instalação de Playwright existente, define `STUDIO_PLAYWRIGHT_PATH` com o caminho para o módulo e executa `pnpm test:local`. Este teste usa Edge instalado; Playwright não é uma dependência necessária para executar o site.

O comando interativo `admin:create` foi testado num terminal Windows com password oculta. O lint dos novos módulos passou. O lint global ainda identifica erros anteriores do painel (`any` e atualização de estado em efeito) e um aviso no HTML exportado; não são erros de compilação e não impedem o build ou os testes.

## Importação Fitness 2026/2027

`pnpm import:fitness` importa as 15 modalidades, 2 serviços adicionais e 26 sessões semanais fornecidas pelo proprietário. Usa a base local configurada em `STUDIO_DB_PATH`, ou `data/studio601.sqlite`, com cópia SQLite consistente em `data/backups/` antes da transação. Esses ficheiros também contêm os dados privados do admin; mantém-nos protegidos como a base original.

Os registos têm origem e identificador de importação persistidos. Repetir acrescenta apenas o que falta; alterações manuais são preservadas e diferenças são apresentadas como conflitos. Não importar os três casos pendentes sem confirmação. As sessões guardam dia e hora local, sem conversão para UTC; a semana é calculada em Europe/Lisbon. Não foram definidos início/fim da época, profissionais ou salas. O fim de cada sessão é calculado pela duração.

Profissional e sala podem ficar vazios no admin. Uma sessão com profissional atribuído continua a exigir um profissional válido da área e só aparece publicamente se esse profissional estiver publicado. Serviços com funcionamento “Contactar para informações” ligam ao contacto configurado e não podem ter sessões. A origem é visível no formulário do admin; os restantes campos e publicação continuam editáveis.

## Importação Studio Dance 2026/2027

`pnpm import:dance` importa o mapa específico: 18 modalidades, 5 profissionais e 19 sessões semanais. O comando cria uma cópia SQLite consistente em `data/backups/` (ou no diretório da base configurada), aplica a migração aditiva `db/migrations/0002-catalog-model.mjs` e grava o lote numa transação. O catálogo é JSON numa coluna SQLite: não é necessário reconstruir tabelas para admitir duração nula ou novos campos. A versão do modelo passa a 2, mantendo os registos e durações anteriores de Fitness e Wellness intactos.

A duração desconhecida é `null`, nunca zero. Idade mínima/máxima e nota de acesso pertencem à sessão. Salas e datas de validade ficam vazias quando não fornecidas. A função dos profissionais pode ficar vazia para não inventar qualificações. Estes campos podem ser editados no admin. O horário e os detalhes públicos apresentam só a hora de início quando não há duração; mostram idades/notas fornecidas e profissionais associados. Dance continua a apresentar apenas os dias com sessões; a equipa geral inclui cada profissional uma vez.

Os identificadores de importação e uma cópia dos valores importados (JSON `importBaseline`) permitem detetar alterações manuais. Repetições não duplicam registos nem substituem essas alterações. Correspondências simples de grafia são reconciliadas quando a origem é reconhecida; homónimos, associações incertas e nomes substancialmente diferentes são apresentados como conflitos. Registos anteriores sem histórico suficiente para distinguir edições manuais são preservados para confirmação. Lady Styling, se existir, é preservada e assinalada.

Teste de browser adicional, com a mesma instalação opcional de Playwright usada nos testes gerais: `node tests/dance-browser.mjs`. Usa credenciais aleatórias e uma base temporária separada; não altera a base ou contas reais.

## Serviços Wellness

`pnpm import:wellness` importa a lista confirmada de sete serviços do proprietário, com origem “Serviços Wellness — lista fornecida pelo proprietário”, descrição vazia, sem profissionais inventados e sem sessões. Faz backup SQLite consistente em `data/backups/` antes de gravar numa transação. A repetição mantém os identificadores e não duplica registos; edições manuais incompatíveis são preservadas e apresentadas como conflitos.

Modalidades/serviços aceitam `sortOrder` opcional (ordem de apresentação) e `professionalIds` opcional (profissionais da mesma área). São campos aditivos no catálogo JSON e não reescrevem os dados anteriores. O admin permite gerir esses campos, descrição, nome, área e publicação. Valores de ordem vazios mantêm a ordem anterior relativa; a lista Wellness importada usa 1 a 7. As ofertas públicas mostram “Sob marcação” e “Pedir marcação” com ligação ao e-mail ou telefone configurado; sem contacto, encaminham para `#contactos`. Não simulam reservas.

O teste opcional `node tests/wellness-browser.mjs`, com `STUDIO_PLAYWRIGHT_PATH` configurado como nos outros testes, usa uma base temporária e credenciais aleatórias para verificar edição, ordenação, associações, marcação, fallback e publicação sem alterar a base real.

## VPS com Docker

A preparação Docker está em [DEPLOY.md](DEPLOY.md), para `studio601.fabiodrbarros.cloud`. Inclui Next.js standalone, volume para SQLite e uploads, healthcheck, backups e instruções para reutilizar o proxy/Tunnel existente. O deploy será executado pelo proprietário; nenhuma alteração foi feita na VPS ou na Cloudflare. Consultar [DEPLOY-VALIDATION.md](DEPLOY-VALIDATION.md) para os testes locais e verificações ainda pendentes.

## Fotografias e textos no admin

Em «Modalidades e serviços» → «Editar», usar «Fotografia da modalidade» e «Descrição», depois «Guardar». Cada modalidade tem uma imagem e um texto próprios, independentes dos seus vários horários. Descrições vazias não apresentam texto inventado.

Selecionar Fitness, Wellness ou Dance no admin e abrir «Fotografias». Cada área tem o seu «Card da área» e a sua «Fotografia do espaço», usada apenas na secção do espaço dessa área. Clicar em «Guardar fotografias». Ao mudar de área, o formulário mostra as fotografias correspondentes. Os cards mantêm as fotografias já fornecidas até serem substituídas; «Repor fotografia original» recupera a fotografia inicial do card. Nos espaços e modalidades, remover a fotografia repõe o espaço reservado.

Aceita JPG, PNG e WebP até 10 MB e 40 megapíxeis. O servidor exige autenticação e origem válida, verifica e descodifica os ficheiros, corrige a orientação, remove metadados e guarda uma versão WebP com transparência preservada. Usa [Sharp](https://sharp.pixelplumbing.com/api-constructor/) para a validação e processamento.

As referências ficam no catálogo SQLite e os ficheiros na pasta `uploads` junto da base de dados (por omissão, `data/uploads`). Não é necessário rebuild para alterar fotografias ou textos. Reiniciar não elimina imagens. Incluir esta pasta nas cópias de segurança e numa futura instalação na VPS. Remover uma referência no admin não apaga fisicamente um ficheiro que possa estar associado a outros conteúdos.

Verificação completa de uploads, edição pelo admin, apresentação pública, segurança e persistência: `node tests/media-browser.mjs` (com Playwright/Edge disponíveis; `STUDIO_PLAYWRIGHT_PATH` permite indicar o módulo Playwright). O teste usa uma base temporária, não altera os dados reais.

Em «EQUIPA» → «Adicionar» ou «Editar», usar «Fotografia do membro da equipa» e depois «Guardar». A mesma fotografia acompanha a pessoa nas áreas a que pertence e na equipa geral; não abre um popup. Remover a fotografia repõe o espaço reservado. Aplica-se a mesma validação e persistência dos outros uploads.

Os Contactos do Studio são geridos no botão global «CONTACTOS», junto de «EQUIPA», fora de Fitness, Wellness e Dance. A edição mantém os mesmos contactos partilhados por todo o site.

O painel administrativo usa agora a identidade do site: logótipo geral, Manrope, fundo branco, navegação escura e cores da área ativa. Equipa e Contactos mantêm entradas globais. Os formulários e diálogos acompanham a tipografia e as cores, sem alterar autenticação ou dados.

As secções públicas têm animações de entrada e as aulas têm uma transição curta ao mudar de dia ou semana. Os movimentos usam as APIs do navegador, sem novas dependências, e deixam sempre o conteúdo visível se o módulo não carregar. Respeitam «prefers-reduced-motion», incluindo alterações dessa preferência com a página aberta. Não modificam os dados ou o admin.

Verificação opcional, apenas de leitura, das animações, navegação, dias e semanas nas larguras 1440, 390 e 320 px: `node tests/site-motion-browser.mjs`. Usa a instalação de Playwright indicada por `STUDIO_PLAYWRIGHT_PATH` e o site local em execução; `STUDIO_TEST_URL` permite outro endereço local.

Na mesma secção «Fotografias», cada modalidade e serviço da área selecionada tem um campo próprio. Carregar a imagem e clicar em «Guardar fotografias»; a imagem aparece no card dessa modalidade no site. Este campo e o campo do formulário «Editar» alteram a mesma fotografia, independente das fotografias do espaço e do card da área.
