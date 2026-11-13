/* Studio JM — Galeria de trabalhos reais (imagens hospedadas no mesmo repositório)
 * As 20 fotos precisam estar em /img/gallery/studio-2026/ antes do merge.
 */
(() => {
  "use strict";
  const base = "./img/gallery/studio-2026/";
  const gallery = [
    { file: "corte-pompadour.webp", category: "cortes", caption: "Corte clássico com volume e degradê" },
    { file: "trancas-lateral.webp", category: "trancas", caption: "Tranças com desenho lateral" },
    { file: "degrade-barba.webp", category: "cortes", caption: "Degradê com barba alinhada" },
    { file: "trancas-traseira.webp", category: "trancas", caption: "Tranças vistas por trás" },
    { file: "corte-moderno.webp", category: "cortes", caption: "Corte moderno com acabamento lateral" },
    { file: "barba-acabamento.webp", category: "barba", caption: "Detalhe do acabamento da barba" },
    { file: "trancas-bun.webp", category: "trancas", caption: "Tranças presas com acabamento" },
    { file: "trancas-resultado.webp", category: "trancas", caption: "Resultado de tranças com mechas claras" },
    { file: "corte-degrade.webp", category: "cortes", caption: "Degradê masculino com acabamento limpo" },
    { file: "trancas-perfil.webp", category: "trancas", caption: "Tranças com acabamento lateral" },
    { file: "cabelo-atendimento.webp", category: "atendimento", caption: "Atendimento capilar no salão" },
    { file: "trancas-preso.webp", category: "trancas", caption: "Penteado trançado preso" },
    { file: "barba-procedimento.webp", category: "barba", caption: "Precisão na finalização da barba" },
    { file: "corte-social.webp", category: "cortes", caption: "Corte social penteado" },
    { file: "trancas-profissional.webp", category: "trancas", caption: "Processo de tranças no Studio JM" },
    { file: "cabelo-preparacao.webp", category: "atendimento", caption: "Preparação para tratamento capilar" },
    { file: "barba-atendimento.webp", category: "atendimento", caption: "Atendimento de barba" },
    { file: "trancas-aplicacao.webp", category: "trancas", caption: "Tranças em execução" },
    { file: "ambiente-salao.webp", category: "atendimento", caption: "Ambiente e atendimento no Studio JM" },
    { file: "cabelo-profissional.webp", category: "atendimento", caption: "Profissional preparando atendimento capilar" }
  ];
  const categoryTitles = { cortes: "Cortes", trancas: "Tranças", barba: "Barba", atendimento: "No salão" };

  const galleryTrack = document.getElementById("galleryTrack");
  const filters = document.querySelectorAll("[data-studio-gallery-filter]");
  const lightbox = document.getElementById("studioGalleryLightbox");
  const lightboxImage = document.getElementById("studioGalleryImage");
  const lightboxDescription = document.getElementById("studioGalleryDescription");
  if (!galleryTrack || !lightbox || !lightboxImage) return;

  // Usar DOM API, nao HTML gerado de dados externos.
  const fragment = document.createDocumentFragment();
  for (const photo of gallery) {
    const card = document.createElement("figure");
    card.className = "studio-gallery-card";
    card.dataset.category = photo.category;
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Ampliar foto: " + photo.caption);
    const image = document.createElement("img");
    image.src = base + photo.file;
    image.alt = photo.caption + " — Studio JM";
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 960;
    image.height = 1280;
    // Fallback para evitar imagem quebrada enquanto os arquivos sao publicados.
    image.addEventListener("error", () => {
      if (image.dataset.fallback) return;
      image.dataset.fallback = "true";
      image.src = "./img/gallery/salao-1.jpg";
    });
    button.appendChild(image);
    button.addEventListener("click", () => {
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      if (lightboxDescription) lightboxDescription.textContent = photo.caption;
      if (typeof lightbox.showModal === "function") lightbox.showModal();
    });

    const caption = document.createElement("figcaption");
    const category = document.createElement("span");
    category.className = "studio-gallery-category";
    category.textContent = categoryTitles[photo.category] || "Trabalho";
    const label = document.createElement("span");
    label.className = "studio-gallery-caption";
    label.textContent = photo.caption;
    caption.append(category, label);
    card.append(button, caption);
    fragment.appendChild(card);
  }
  galleryTrack.replaceChildren(fragment);
  for (const filter of filters) {
    filter.addEventListener("click", () => {
      const chosen = filter.dataset.studioGalleryFilter || "todos";
      for (const item of filters) {
        item.setAttribute("aria-pressed", String(item === filter));
      }
      for (const card of galleryTrack.querySelectorAll(".studio-gallery-card")) {
        card.hidden = chosen !== "todos" && card.dataset.category !== chosen;
      }
      galleryTrack.scrollTo({ left: 0, behavior: "smooth" });
    });
  }
  document.getElementById("studioGalleryClose")?.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) lightbox.close();
  });
})();
