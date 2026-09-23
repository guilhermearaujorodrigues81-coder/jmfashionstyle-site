# Avisos automáticos de agendamento

Destinatário configurado:

- Cristiano
- E-mail: `studiojm27oficial@gmail.com`
- WhatsApp: `5511954773332`

## 1. Preparar o banco

Execute no SQL Editor do Supabase, nesta ordem:

1. `fase_6_0_agenda_operacional.sql`
2. `fase_6_1_notificacoes.sql`

## 2. Configurar o e-mail

1. Crie uma conta no Resend.
2. Valide o domínio usado para enviar os e-mails.
3. Crie uma API Key.
4. Cadastre os seguintes secrets da Edge Function:

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Studio JM <agenda@seudominio.com.br>
PROFESSIONAL_EMAIL=studiojm27oficial@gmail.com
PROFESSIONAL_WHATSAPP=5511954773332
ADMIN_PANEL_URL=https://jmfashionstyle.com.br/app/admin.html#agenda
BOOKING_WEBHOOK_SECRET=uma-chave-longa-e-aleatoria
```

Nunca coloque essas chaves em `config.js`, no GitHub ou no código público do site.

## 3. Publicar a função

Publique a Edge Function `notify-new-appointment` pelo Supabase CLI ou pelo painel.
O arquivo `config.toml` deixa a validação por JWT desativada porque a chamada será autenticada pelo header secreto do webhook.

## 4. Criar o Database Webhook

No painel do Supabase:

1. Acesse **Database → Webhooks**.
2. Crie um webhook chamado `notify-new-appointment`.
3. Selecione a tabela `public.appointments`.
4. Marque somente o evento `INSERT`.
5. Escolha a Edge Function `notify-new-appointment` com método `POST`.
6. Adicione o header `x-webhook-secret` usando o mesmo valor de `BOOKING_WEBHOOK_SECRET`.

## 5. Testar

Faça um agendamento de teste. Confira:

- O e-mail recebido em `studiojm27oficial@gmail.com`.
- Os logs da Edge Function.
- A tabela `appointment_notifications`, que registra `sent`, `failed` ou `skipped`.

O controle de idempotência evita que o mesmo aviso seja enviado duas vezes para o mesmo agendamento.

## 6. Ativar o WhatsApp depois

Quando a conta Meta Business estiver pronta:

1. Configure um número na WhatsApp Cloud API.
2. Crie e aprove o template `novo_agendamento_profissional` em português do Brasil.
3. Use quatro variáveis no corpo: cliente, serviço, data e horário.
4. Cadastre os secrets:

```text
META_WHATSAPP_TOKEN=token-permanente
META_PHONE_NUMBER_ID=id-do-numero-remetente
META_BOOKING_TEMPLATE=novo_agendamento_profissional
```

Enquanto essas credenciais não existirem, o e-mail funciona normalmente e o WhatsApp fica registrado como `skipped`, sem causar erro no agendamento.
