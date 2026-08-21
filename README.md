# Studio JM

Site oficial do Studio JM.

## Como publicar no GitHub

1. Extraia o ZIP.
2. No repositório, clique em **Add file → Upload files**.
3. Arraste todos os arquivos e pastas extraídos.
4. Confirme que `index.html`, `css`, `js` e `img` aparecem na raiz.
5. Clique em **Commit changes**.
6. Em **Settings → Pages**, escolha:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)

WhatsApp configurado: (11) 95477-3332


## Fase 1 — Visual Premium
Hero redesenhado, navegação refinada, cards premium, diferenciais, depoimentos e animações.


## Fase 2
Hero com vídeos otimizados e agendamento em cinco etapas com confirmação pelo WhatsApp.

## Fase 2.1 — Correções

- Reprodução automática dos vídeos com fallback para imagem
- Calendário visual com dias clicáveis
- Domingos e datas anteriores bloqueados
- Redirecionamento confiável para o WhatsApp na mesma aba
- Link alternativo para abrir o WhatsApp
- Verificação de sintaxe do JavaScript concluída

## Fase 2.2 — vídeo no computador

- Removido o bloqueio que ocultava os vídeos quando o Windows estava com redução de animações ativa
- Vídeos continuam visíveis em computadores e celulares
- Nova tentativa automática de reprodução ao carregar ou retornar para a aba
- Fallback para imagem somente em erro real do arquivo

## Fase 2.3 — Plano Ouro

- Plano VIP renomeado para Plano Ouro
- Valor mantido em R$ 219,90/mês
- Benefícios mantidos
- Mensagem de interesse pelo WhatsApp atualizada automaticamente

## Fase 3 — Clube Studio JM

- Cards de assinatura reformulados
- Destaque para o Plano Ouro
- Comparação completa dos planos
- Calculadora de economia
- Recomendação automática de plano
- Perguntas frequentes
- Adesão pelo WhatsApp


## Fase 3.1 — Comparação Premium
- Comparação Ouro x Family VIP redesenhada
- Cabeçalho preto e dourado
- Coluna de benefícios com ícones
- Texto corrigido para “Serviços incluídos”
- Melhor leitura em desktop e celular

## Fase 3.2 — Comparação de todos os planos

- Bronze, Prata, Ouro e Family VIP na mesma tabela
- Valores mensais no cabeçalho
- Comparação de serviços, pessoas, hidratação, freestyle e descontos
- Prata destacado como mais escolhido
- Ouro destacado como mais vantajoso
- Botão de adesão para cada plano
- Rolagem horizontal orientada no celular

## Fase 4 — Google e localização

- Perfil da Studio JM no Google integrado
- Nota 5,0 e 23 avaliações
- Endereço e telefone reais
- Google Maps incorporado
- Botões para rota, perfil e avaliação
- Seção de reputação e confiança
- Correção do Plano Ouro para 2 freestyles por mês

## Fase 4.1 — Links organizados

- Agendar abre o calendário interno
- Como chegar abre a rota no Google Maps
- Ver no Google abre o perfil da Studio JM
- Ver avaliações abre a pesquisa focada nas avaliações
- Avaliar abre o perfil para o cliente selecionar a opção Avaliar

## Fase 4.2 — Links finais do Google

- Como chegar usa a rota direta fornecida
- Ver no Google abre o perfil principal
- Ver avaliações abre a página de comentários
- Avaliar a Studio JM abre o link específico de avaliação
- Agendamento continua usando o calendário interno

## Fase 4.3

- Mantidos os cards principais Bronze, Prata, Ouro e Family VIP
- Removida somente a segunda comparação em formato de tabela


## Fase 5.1 — Base do sistema

Implementado:

- Supabase Auth
- Cadastro de cliente
- Login
- Perfil individual
- Edição de nome e telefone
- Perfil `client`
- Perfil `admin`
- RLS no banco
- Bloqueio do painel administrativo para clientes
- Base administrativa de clientes
- Busca por nome, e-mail e WhatsApp

Não incluído nesta fase:
- Agenda
- Planos e créditos
- Pagamentos
- Automação


## Fase 5.1.2 — Sessão persistente

- Sessão Supabase persistida no navegador
- Auto refresh de token
- Site público reconhece usuário autenticado
- "Área do cliente" muda para "Minha conta" ou "Painel Admin"
- Login redireciona automaticamente usuários já autenticados
- Base preparada para contratação de planos vinculada à conta autenticada

## Fase 5.2.1 — Agenda

Implementado:
- Cristiano como profissional único
- Terça a sábado
- 09h às 19h
- Serviços de 1 hora
- Cliente escolhe serviço, data e horário
- Horários ocupados ficam indisponíveis
- Cliente pode cancelar
- Admin pode confirmar, concluir, cancelar e marcar falta
- Admin pode criar e remover bloqueios
- Calendário mensal, semanal e diário estilo Google Agenda

## Fase 5.2.2 — Agenda integrada ao site

- Botões de agendamento do site levam ao sistema interno
- WhatsApp deixa de ser canal de agendamento
- WhatsApp permanece como SAC
- Cliente sem login é levado ao login e retorna para a agenda
- Cliente logado entra direto na agenda
- Interface da área do cliente simplificada
- Interface administrativa com foco na agenda
