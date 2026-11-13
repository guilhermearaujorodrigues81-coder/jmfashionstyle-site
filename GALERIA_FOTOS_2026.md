# Studio JM — Galeria de fotos reais (novembro/2026)

Atualização preparada em uma branch separada para não modificar o site atual antes de anexar as imagens e conferir autorizações.

## Mudanças no site
- Seção **Trabalhos reais** com visual escuro/dourado.
- Filtros: Todos / Cortes / Barbas / Tranças / No salão.
- Galeria responsiva com rolagem horizontal, navegação e visualização ampliada.
- 20 fotos reais selecionadas e convertidas para **WebP** (cerca de 1,9 MB no total, sem metadados de localização).
- As imagens preservam o resultado real, sem embelezamento artificial ou alterações nos penteados.

## IMPORTANTE — Colocar os 20 arquivos WebP no repositório
O código está pronto, mas os arquivos das fotos foram entregues separadamente no ChatGPT como **studiojm_fotos_site.zip**. Não faça merge antes de anexá-los.

1. Baixe o arquivo `studiojm_fotos_site.zip` fornecido pelo ChatGPT.
2. Extraia o ZIP no computador. Dentro está `img/gallery/studio-2026/` com os 20 arquivos `.webp`.
3. No GitHub, abra a branch `feature/galeria-fotos-reais-nov2026` e navegue até a pasta `img/gallery/studio-2026/`.
4. Clique em **Add file → Upload files**.
5. Arraste os **20 arquivos `.webp` (não arraste o ZIP)** para essa pasta.
6. Confirme o commit na própria branch da galeria.
7. Verifique se os 20 arquivos aparecem na pasta. Só então faça merge do Pull Request.

## Autorizações e privacidade
Antes de publicar fotos de clientes ou colaboradores identificáveis, confira se houve autorização para divulgação no site comercial do Studio JM. **Não publicar fotografias de crianças sem autorização do responsável**. Esta seleção evita fotos de crianças, mas todos os adultos identificáveis também devem autorizar o uso publicitário.

## Não alterar
Esta mudança não interfere no login, Supabase, agenda, notificações push ou cadastros existentes. O vídeo enviado pelo usuário não foi incluído nesta primeira galeria (precisa ser testado e otimizado separadamente).
