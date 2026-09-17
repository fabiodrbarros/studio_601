# Recuperar conteúdo local mantendo o admin da VPS

O Git não transporta a base SQLite nem os uploads. Para uma VPS onde apenas foi criada a conta de admin, `scripts/transfer-content.mjs` importa apenas o catálogo e as fotografias, preservando todas as contas, passwords e sessões da VPS.

## Exportação no computador de origem

```powershell
node scripts/transfer-content.mjs export C:/Users/Fabio/studio601-content-recovery-20260917
tar -czf C:/Users/Fabio/studio601-content-recovery-20260917.tar.gz -C C:/Users/Fabio/studio601-content-recovery-20260917 .
scp C:/Users/Fabio/studio601-content-recovery-20260917.tar.gz fabiodrb@home-server:~/
```

A exportação de 17/09/2026 já foi preparada neste computador: versão 25, 42 modalidades/serviços, 3 profissionais, 45 sessões e 2 fotografias. Não repetir a exportação para o mesmo diretório: o comando recusa sobrescrevê-lo. Se o hostname `home-server` não for resolvido pelo computador, usar o IP/alias SSH habitual. Os dados ficam fora do repositório e não contêm contas nem hashes de passwords.

O catálogo é obtido numa leitura SQLite consistente; os uploads existentes são imutáveis. Todas as fotografias referenciadas são copiadas e verificadas por SHA-256. Não copiar a base em uso diretamente.

## Na VPS

```sh
cd ~/studio601
git pull --ff-only && docker compose up -d --build
```

Confirmar que o arquivo chegou à pasta pessoal. Importar:

```sh
sh scripts/import-content.sh "$HOME/studio601-content-recovery-20260917.tar.gz"
```

O comando executa como utilizador `node`. Antes de gravar, valida os hashes, recusa substituir um catálogo diferente já existente e faz uma cópia SQLite consistente em `/data/backups/before-content-*.sqlite`. Insere o catálogo numa transação e copia as fotos sem sobrescrever ficheiros diferentes. Não altera as tabelas de autenticação. Pode repetir a importação do mesmo catálogo; se já houver edições na VPS, para sem as substituir.

Verificar `imported: true` e `administratorsPreserved: true` na resposta. Abrir o site e o admin e atualizar a página para voltar a carregar o catálogo. Entrar com o utilizador e a password que já criaste na VPS. Confirmar profissionais, contactos, horários e fotografias. A importação não exige reinício nem uma nova conta.

```sh
curl --fail http://127.0.0.1:30601/api/health
curl --fail https://studio601.fabiodrbarros.cloud/api/health
```

Se surgir a mensagem de catálogo diferente, não apagar a base: comparar os dois catálogos antes de reconciliar. A base local original e a exportação permanecem intactas. O backup pré-importação está no volume da VPS; as instruções gerais para backup/restauro encontram-se em `DEPLOY.md`.
