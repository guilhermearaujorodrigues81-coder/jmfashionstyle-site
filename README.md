# Studio JM

Site oficial do Studio JM.

## Versão 6.0 — Premium e tablet-first

- Nova direção visual premium no site público
- Painel administrativo redesenhado para a rotina do salão
- Agenda com cartões maiores, hierarquia visual e status por cor
- Filtros rápidos para pendentes, confirmados e concluídos
- Relógio operacional e resumo do dia em destaque
- Navegação compacta em tablet e barra inferior no celular
- Botões e áreas de toque ampliados para uso confortável
- Estrutura, autenticação, regras do Supabase e dados existentes preservados

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


## Fase 5.3.1 — Planos vinculados à conta

- Catálogo de planos no Supabase
- Bronze, Prata, Ouro e Family VIP
- Cliente escolhe plano no site
- Cliente não logado passa por login e volta ao plano escolhido
- Página de confirmação de plano
- Solicitação salva na conta com status `pending`
- Área do cliente exibe plano selecionado
- Cliente pode cancelar solicitação pendente
- Painel admin exibe planos selecionados pelos clientes
- Estrutura preparada para ciclos, créditos, validade e pagamentos


## Fase 5.3.3 — Créditos integrados à agenda

- Corte = 1 crédito
- Barba = 1 crédito
- Corte + Barba = 2 créditos
- Corte Infantil = 1 crédito
- Outros = avulso
- Bronze cobre Corte
- Prata, Ouro e Family VIP cobrem Corte, Barba, Corte + Barba e Corte Infantil
- Agendamento reserva créditos sem descontar
- Cancelamento libera a reserva
- Conclusão pelo admin desconta créditos
- Extrato de créditos no painel do cliente
- Serviços sem cobertura/saldo seguem como avulso
- Saldo disponível considera créditos já reservados


## Fase 5.3.4 — Acabamento da experiência de planos

- Painel de plano reorganizado e menos poluído
- Créditos disponíveis separados dos créditos reservados
- Saldo total do ciclo e progresso de consumo
- Benefícios do plano em destaque
- Validade e status mais claros
- Avisos para plano pendente, suspenso, sem saldo e ciclo próximo do fim
- Atalhos para agendamento e extrato
- Resumo administrativo com ativos, pendentes, suspensos e créditos em aberto


## Fase 5.4.1 — Gestão operacional

- Visão geral administrativa
- Atendimentos de hoje
- Próximos 7 dias
- Total de clientes cadastrados
- Planos ativos
- Agenda do dia em destaque
- Área de atenção operacional
- Busca de clientes
- Busca e filtro de assinantes
- Removidos do resumo de planos: "Aguardando ativação" e "Créditos em aberto"
- Solicitações pendentes continuam disponíveis na gestão de planos

## Fase 5.4.2 — Gestão de Clientes

- Ficha individual de cliente
- Dados cadastrais
- Plano, status, validade e saldo
- Créditos disponíveis, reservados e saldo do ciclo
- Próximos agendamentos
- Histórico de atendimentos
- Extrato de créditos
- Acesso "Ver ficha" na base de clientes

## Fase 5.4.3 — Agenda administrativa refinada

- Visão Geral removida para deixar o Admin mais limpo
- Admin focado em Agenda, Clientes e Planos
- Agenda diária simples e operacional
- Navegação por dia e botão Hoje
- Busca por cliente/serviço e filtro por status
- Contadores de pendentes e confirmados
- Plano x avulso visível
- Ações rápidas: Confirmar, Concluir, Falta e Cancelar
- Bloqueio de horário preservado
- Link direto para a ficha do cliente


## Fase 5.4.4 — Revisão final / base estável

Revisão feita sobre a versão 5.4.3 corrigida enviada após validação no GitHub.

Ajustes:
- removido FullCalendar legado e sua dependência externa do Admin;
- removida lógica antiga da Visão Geral que já não existia na interface;
- removida duplicidade de busca na área de Clientes;
- removido bloco técnico "Modelo de permissões" do painel operacional;
- corrigido "Bloquear horário", que ainda dependia da inicialização do calendário antigo;
- removido carregamento duplicado antigo de planos;
- navegação da ficha do cliente alinhada com Agenda / Clientes / Planos;
- removido link morto para "Visão geral";
- reduzidas referências JavaScript implícitas a IDs do DOM;
- mantidos Agenda, Clientes, Planos, créditos e regras existentes.


## Fase 5.4.5 — Gestão de Bloqueios

- Bloqueios aparecem diretamente na Agenda do Admin
- Horário inicial e final visíveis
- Motivo do bloqueio visível
- Botão "Liberar horário"
- Ao liberar, o registro é removido de `schedule_blocks`
- O horário volta a ficar disponível imediatamente para clientes
- Opção "Bloquear o dia inteiro" (09h às 19h)
- Bloqueio parcial continua disponível
- Bloqueios e atendimentos aparecem juntos em ordem cronológica

## Fase 5.4.6 — Novo Admin / UX Operacional
- Abas reais: Hoje, Agenda, Clientes e Planos
- Apenas uma área aparece por vez
- Tela Hoje com próximo atendimento
- Grade 09h–19h mostrando Livre, Bloqueado e atendimentos
- Bloqueio pode ser liberado na tela Hoje
- Agenda completa permanece em aba separada
- Clientes e Planos separados
- Estrutura pronta para futura aba Financeiro


## Fase 5.4.7 — Cadastro, QR Code e Responsividade

- Campo opcional "Data de aniversário" no cadastro
- Cliente pode adicionar/alterar aniversário em Minha Conta
- Aniversário visível na lista administrativa e ficha do cliente
- QR Code oficial preparado para: https://studiojmoficial.com.br/
- QR Code incluído no rodapé do site
- QR Code em PNG disponível em `img/qrcode-studiojmoficial.png`
- Responsividade do site público refeita para celular/tablet
- Menu mobile, hero, cards, planos, galeria, mapas e tabelas ajustados
- Área do cliente e Admin ajustadas para tablets e celulares
- Sidebar do sistema vira menu lateral móvel em telas menores
- Tabelas administrativas passam a ter rolagem horizontal segura


## Fase 5.4.7.2 — Recuperação de senha
- Restaurado "Esqueci minha senha" na tela de login
- Página própria para solicitar link de recuperação
- Redirecionamento dinâmico pelo domínio atual (`window.location.origin`)
- Página de redefinição de senha
- Mensagem para verificar também a pasta de spam
- Compatível com `studiojmoficial.com.br`
