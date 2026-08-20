# Studio JM — Fase 5.1

Esta fase contém somente:

- banco de dados;
- cadastro;
- login;
- clientes;
- permissões.

Agenda, planos/créditos e pagamentos **não fazem parte da Fase 5.1**.

## Etapa A — Criar o Supabase

1. Entre em https://supabase.com
2. Crie um projeto.
3. Aguarde a criação do banco.
4. Abra `SQL Editor`.
5. Copie todo o arquivo `supabase/fase_5_1.sql`.
6. Cole no SQL Editor e clique em `Run`.

## Etapa B — Configurar autenticação

Em `Authentication`:

1. Abra `Providers`.
2. Mantenha `Email` ativado.
3. Para os primeiros testes, você pode deixar confirmação de e-mail desativada.
4. Antes de colocar o sistema em produção, recomendamos ativar confirmação de e-mail.

## Etapa C — Pegar as chaves públicas

No Supabase:

`Project Settings → API`

Copie:

- Project URL
- anon / public key

Abra:

`app/config.js`

Substitua:

```js
SUPABASE_URL: "COLE_AQUI_SUA_SUPABASE_URL",
SUPABASE_ANON_KEY: "COLE_AQUI_SUA_SUPABASE_ANON_KEY"
```

A chave `service_role` **NUNCA deve ser colocada no GitHub**.

## Etapa D — Criar o primeiro administrador

1. Publique o site.
2. Acesse `app/cadastro.html`.
3. Cadastre a conta que será administradora.
4. No Supabase, abra `Table Editor → profiles`.
5. Localize esse cadastro.
6. Altere `role` de `client` para `admin`.

Ao fazer login novamente, o sistema encaminhará a conta para:

`app/admin.html`

Clientes comuns irão para:

`app/cliente.html`

## Testes obrigatórios antes de dizer “finalizado”

### Cliente

- [ ] Criar conta.
- [ ] Entrar.
- [ ] Abrir `cliente.html`.
- [ ] Ver somente os próprios dados.
- [ ] Alterar nome/telefone.
- [ ] Sair e entrar novamente.
- [ ] Tentar abrir `admin.html` e ser redirecionado.

### Administrador

- [ ] Entrar com conta admin.
- [ ] Abrir `admin.html`.
- [ ] Visualizar os clientes cadastrados.
- [ ] Pesquisar cliente por nome/e-mail/telefone.
- [ ] Confirmar que cliente comum não consegue acessar a base inteira.

Somente depois desses testes consideramos a **Fase 5.1 finalizada**.
