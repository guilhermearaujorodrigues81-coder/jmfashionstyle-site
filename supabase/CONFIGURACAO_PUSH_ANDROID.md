# Studio JM — Notificações push gratuitas no Android

Arquivos desta implementação:
- /sw.js: recebe push mesmo quando o site não está aberto (Chrome Android).
- /app/admin-push.js: botão de autorização e armazenamento da assinatura, apenas admin.
- /app/admin.html: painel para ativar notificações.
- /supabase/fase_6_2_push_android.sql: tabelas push_subscriptions e appointment_push_deliveries, RLS.
- /supabase/functions/appointment-push/index.ts: consulta os agendamentos, dispara push e evita duplicatas.
- /supabase/config.toml: JWT desativado na função para permitir webhook, protegido com secret no POST.

## Instalação (na ordem)
1. **Antes de alterar produção, revise o Pull Request no GitHub.**
2. Execute o SQL de `supabase/fase_6_2_push_android.sql` no SQL Editor do **mesmo projeto Supabase usado pelo site**. Este SQL não altera as tabelas de clientes ou agendamentos.
3. Gere um par novo de chaves VAPID. Em um computador com Node.js:
   ```sh
   npx --yes web-push generate-vapid-keys --json
   ```
   Guarde a chave privada em local seguro. A chave pública é própria para ser enviada ao navegador.
4. No Supabase > Edge Functions > Secrets, configure:
   - `VAPID_PUBLIC_KEY`: `publicKey` gerada
   - `VAPID_PRIVATE_KEY`: `privateKey` gerada **(NUNCA no GitHub)**
   - `VAPID_SUBJECT`: `mailto:studiojm27oficial@gmail.com`
   - `BOOKING_WEBHOOK_SECRET`: texto longo, aleatório, secreto (se já existir para a função anterior, pode utilizar o mesmo valor)
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são normalmente geridos pelo Supabase, confira se estão disponíveis na função.
5. Publique a Edge Function `appointment-push` (pelo painel ou CLI). O código está no repositório, mas **não é publicado automaticamente** pelo GitHub Pages. Pelo CLI, no diretório raiz do projeto, após vincular o projeto:
   ```sh
   supabase functions deploy appointment-push --no-verify-jwt
   ```
6. Em **Database → Webhooks**, crie um webhook:
   - Nome: `studiojm-appointment-push`
   - Tabela: `public.appointments`
   - Evento: apenas **INSERT**
   - Método: **POST**
   - URL: `https://SEU-PROJECT-REF.supabase.co/functions/v1/appointment-push`
   - Header: `x-webhook-secret` = exatamente o valor de `BOOKING_WEBHOOK_SECRET`
   - Content-Type: application/json
   Mantenha o secret fora do repositório. O webhook é separado das notificações antigas.
7. Depois de revisar, faça o merge do PR para a branch `main` (publicação do GitHub Pages).
8. No **Chrome do Android** do Cristiano, abra `https://studiojmoficial.com.br/app/admin.html`, entre como administrador e toque em **Ativar notificações neste celular**. Autorize o navegador. Não use guia anônima.
9. Faça **um agendamento de teste** com dados fictícios e confirme que chegou uma notificação. Confira logs da Edge Function e a tabela `appointment_push_deliveries` se algo falhar.

## Segurança / comportamento
- Notifica apenas administradores, não clientes; RLS protege a gravação das assinaturas.
- Não expõe a chave privada VAPID nem a service role no frontend.
- A criação do agendamento independe da resposta do push. Se falhar, o agendamento permanece salvo.
- Um evento INSERT repetido não deve gerar outra notificação para o mesmo dispositivo/agendamento.
- A versão atual envia alertas para agendamentos inseridos com status `pending` ou `confirmed`. Não notifica alterações, cancelamentos ou reprogramações.
- As notificações dependem da permissão do Android/Chrome, conexão de rede e entrega pelo serviço push do navegador; não é garantia absoluta de entrega instantânea.
- Web Push não cobra por mensagem; aplicam-se os limites gratuitos usuais do Supabase.
- **Caso os webhooks antigos de email/WhatsApp estejam ativos**, podem continuar enviando por seus canais. Desabilite-os no painel caso queira usar somente push.

## Diagnóstico
```sql
SELECT status, http_status, attempted_at, sent_at, error_message
FROM public.appointment_push_deliveries
ORDER BY attempted_at DESC LIMIT 20;
```
```sql
SELECT count(*) AS androids_ativos FROM public.push_subscriptions;
```
