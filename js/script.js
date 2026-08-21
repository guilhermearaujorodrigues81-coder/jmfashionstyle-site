
const WHATSAPP="5511954773332";

window.addEventListener("scroll",()=>{
  document.querySelector(".nav").classList.toggle("scrolled",window.scrollY>40);
});

document.getElementById("menuButton").addEventListener("click",()=>{
  document.getElementById("navLinks").classList.toggle("open");
});

document.querySelectorAll("#navLinks a").forEach(link=>{
  link.addEventListener("click",()=>document.getElementById("navLinks").classList.remove("open"));
});

const modal=document.getElementById("serviceModal");
const modalTitle=document.getElementById("modalTitle");
const modalPrices=document.getElementById("modalPrices");

document.querySelectorAll(".service-button").forEach(button=>{
  button.addEventListener("click",()=>{
    const category=window.STUDIO_SERVICES[button.dataset.category];
    modalTitle.textContent=category.title;
    modalPrices.innerHTML=category.items.map(item=>`
      <div class="price-row"><span>${item[0]}</span><strong>${item[1]}</strong></div>
    `).join("");
    modal.classList.add("open");
  });
});

document.getElementById("closeModal").addEventListener("click",()=>modal.classList.remove("open"));
modal.addEventListener("click",event=>{if(event.target===modal)modal.classList.remove("open")});

document.querySelectorAll(".plan-button").forEach(button=>{
  button.addEventListener("click",()=>{
    const msg=encodeURIComponent(`Olá! Tenho interesse no Plano ${button.dataset.plan} do Studio JM.`);
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`,"_blank");
  });
});

const gallery=document.getElementById("galleryTrack");
document.getElementById("prevGallery").addEventListener("click",()=>gallery.scrollBy({left:-340,behavior:"smooth"}));
document.getElementById("nextGallery").addEventListener("click",()=>gallery.scrollBy({left:340,behavior:"smooth"}));

const serviceSelect=document.getElementById("service");
Object.values(window.STUDIO_SERVICES).forEach(category=>{
  category.items.forEach(item=>{
    const option=document.createElement("option");
    option.value=`${item[0]} — ${item[1]}`;
    option.textContent=`${category.title}: ${item[0]} — ${item[1]}`;
    serviceSelect.appendChild(option);
  });
});

const dateInput=document.getElementById("date");
dateInput.min=new Date().toISOString().split("T")[0];

document.getElementById("bookingForm").addEventListener("submit",event=>{
  event.preventDefault();
  const date=dateInput.value.split("-").reverse().join("/");
  const msg=encodeURIComponent(
`Olá! Gostaria de solicitar um agendamento no Studio JM.

Nome: ${document.getElementById("name").value}
Telefone: ${document.getElementById("phone").value}
Serviço: ${serviceSelect.value}
Data: ${date}
Horário: ${document.getElementById("time").value}
Observações: ${document.getElementById("notes").value||"Nenhuma"}

Por favor, confirme a disponibilidade.`
  );
  window.open(`https://wa.me/${WHATSAPP}?text=${msg}`,"_blank");
});

const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting) entry.target.classList.add("visible");
  });
},{threshold:.08});
document.querySelectorAll(".reveal").forEach(el=>revealObserver.observe(el));


/* Hero em vídeo — versão corrigida */
const heroVideos = [...document.querySelectorAll(".hero-video")];
const videoDots = [...document.querySelectorAll("#videoProgress span")];
const videoStatus = document.getElementById("videoStatus");
let heroVideoIndex = 0;
let videoFallbackTimer = null;

function markVideoFailure() {
  document.querySelector(".video-hero")?.classList.add("video-fallback");
  if (videoStatus) videoStatus.hidden = false;
}

function playHeroVideo(index) {
  if (!heroVideos.length) {
    markVideoFailure();
    return;
  }

  heroVideos.forEach((video, i) => {
    const active = i === index;
    video.classList.toggle("active", active);
    videoDots[i]?.classList.toggle("active", active);

    if (active) {
      video.currentTime = 0;
      const playPromise = video.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch(markVideoFailure);
        });
      }
    } else {
      video.pause();
    }
  });

  clearTimeout(videoFallbackTimer);
  videoFallbackTimer = setTimeout(() => {
    const current = heroVideos[index];
    if (current && current.readyState >= 1) {
      current.play().catch(() => {});
    }
  }, 5000);
}

heroVideos.forEach((video, index) => {
  video.addEventListener("canplay", () => {
    if (videoStatus) videoStatus.hidden = true;
  });

  video.addEventListener("error", markVideoFailure);

  video.addEventListener("ended", () => {
    heroVideoIndex = (index + 1) % heroVideos.length;
    playHeroVideo(heroVideoIndex);
  });
});

if (heroVideos.length) playHeroVideo(0);

/* Agendamento em etapas — versão corrigida */
const bookingWizard = document.getElementById("bookingWizard");
const wizardPages = [...document.querySelectorAll(".wizard-page")];
const wizardStepMarks = [...document.querySelectorAll("#wizardSteps span")];
const wizardNext = document.getElementById("wizardNext");
const wizardBack = document.getElementById("wizardBack");
const wizardSubmit = document.getElementById("wizardSubmit");
const wizardForm = document.getElementById("wizardForm");
const wizardServiceChoice = document.getElementById("wizardServiceChoice");
const calendarTitle = document.getElementById("calendarTitle");
const calendarDays = document.getElementById("calendarDays");
const calendarSelected = document.getElementById("calendarSelected");
const whatsappFallback = document.getElementById("whatsappFallback");

let wizardStep = 1;
let calendarCursor = new Date();
calendarCursor.setDate(1);

const wizardData = {
  category: "",
  categoryTitle: "",
  service: "",
  professional: "",
  date: "",
  time: ""
};

function resetWizardSelections() {
  wizardStep = 1;
  Object.assign(wizardData, {
    category: "",
    categoryTitle: "",
    service: "",
    professional: "",
    date: "",
    time: ""
  });

  document.querySelectorAll(
    "#categoryChoice button,.professional-choice button,#timeButtons button"
  ).forEach(button => button.classList.remove("selected"));

  wizardServiceChoice.innerHTML = "";
  document.getElementById("wizardName").value = "";
  document.getElementById("wizardPhone").value = "";
  document.getElementById("wizardNotes").value = "";

  calendarCursor = new Date();
  calendarCursor.setDate(1);
  renderCalendar();
}

function showWizardStep() {
  wizardPages.forEach(page => {
    page.classList.toggle("active", Number(page.dataset.step) === wizardStep);
  });

  wizardStepMarks.forEach((mark, index) => {
    mark.classList.toggle("active", index + 1 === wizardStep);
    mark.classList.toggle("done", index + 1 < wizardStep);
  });

  wizardBack.style.visibility = wizardStep === 1 ? "hidden" : "visible";
  wizardNext.style.display = wizardStep === 5 ? "none" : "inline-flex";
  wizardSubmit.style.display = wizardStep === 5 ? "inline-flex" : "none";

  if (wizardStep === 4) renderCalendar();
  if (wizardStep === 5) renderBookingSummary();
}

function openWizard() {
  resetWizardSelections();
  bookingWizard.classList.add("open");
  bookingWizard.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  showWizardStep();
}

function closeWizard() {
  bookingWizard.classList.remove("open");
  bookingWizard.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.querySelectorAll(".open-booking").forEach(button => {
  button.addEventListener("click", openWizard);
});

document.getElementById("closeBooking").addEventListener("click", closeWizard);

bookingWizard.addEventListener("click", event => {
  if (event.target === bookingWizard) closeWizard();
});

document.querySelectorAll("#categoryChoice button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#categoryChoice button").forEach(item => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
    wizardData.category = button.dataset.category;
    wizardData.categoryTitle =
      window.STUDIO_SERVICES[wizardData.category].title;
    wizardData.service = "";

    const category = window.STUDIO_SERVICES[wizardData.category];

    wizardServiceChoice.innerHTML = category.items
      .map(item => `
        <button type="button" data-service="${item[0]} — ${item[1]}">
          <span>${item[0]}</span>
          <strong>${item[1]}</strong>
        </button>
      `)
      .join("");

    wizardServiceChoice.querySelectorAll("button").forEach(serviceButton => {
      serviceButton.addEventListener("click", () => {
        wizardServiceChoice.querySelectorAll("button").forEach(item => {
          item.classList.remove("selected");
        });

        serviceButton.classList.add("selected");
        wizardData.service = serviceButton.dataset.service;
      });
    });
  });
});

document.querySelectorAll(".professional-choice button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".professional-choice button").forEach(item => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
    wizardData.professional = button.dataset.professional;
  });
});

document.querySelectorAll("#timeButtons button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#timeButtons button").forEach(item => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
    wizardData.time = button.dataset.time;
  });
});

/* Calendário visual */
const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric"
});

const selectedDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric"
});

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function renderCalendar() {
  if (!calendarDays || !calendarTitle) return;

  calendarTitle.textContent = monthFormatter.format(calendarCursor);
  calendarDays.innerHTML = "";

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfToday();

  for (let empty = 0; empty < firstWeekday; empty++) {
    const spacer = document.createElement("button");
    spacer.type = "button";
    spacer.className = "calendar-day empty";
    spacer.disabled = true;
    calendarDays.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const key = localDateKey(date);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(day);
    button.dataset.date = key;

    if (date.getTime() === today.getTime()) button.classList.add("today");
    if (key === wizardData.date) button.classList.add("selected");

    const isPast = date < today;
    const isSunday = date.getDay() === 0;
    button.disabled = isPast || isSunday;
    button.title = isSunday ? "Studio fechado aos domingos" : "";

    button.addEventListener("click", () => {
      wizardData.date = key;
      document.querySelectorAll(".calendar-day").forEach(item => {
        item.classList.remove("selected");
      });
      button.classList.add("selected");
      calendarSelected.textContent =
        "Data escolhida: " + selectedDateFormatter.format(date);
    });

    calendarDays.appendChild(button);
  }

  if (wizardData.date) {
    const chosen = new Date(wizardData.date + "T12:00:00");
    calendarSelected.textContent =
      "Data escolhida: " + selectedDateFormatter.format(chosen);
  } else {
    calendarSelected.textContent = "Selecione uma data disponível.";
  }
}

document.getElementById("calendarPrev").addEventListener("click", () => {
  const now = new Date();
  const previous = new Date(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth() - 1,
    1
  );

  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (previous < currentMonth) return;

  calendarCursor = previous;
  renderCalendar();
});

document.getElementById("calendarNext").addEventListener("click", () => {
  calendarCursor = new Date(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth() + 1,
    1
  );
  renderCalendar();
});

function validWizardStep() {
  if (wizardStep === 1 && !wizardData.category) {
    alert("Escolha uma categoria.");
    return false;
  }

  if (wizardStep === 2 && !wizardData.service) {
    alert("Escolha um serviço.");
    return false;
  }

  if (wizardStep === 3 && !wizardData.professional) {
    alert("Escolha uma opção de profissional.");
    return false;
  }

  if (wizardStep === 4 && (!wizardData.date || !wizardData.time)) {
    alert("Escolha uma data no calendário e um horário.");
    return false;
  }

  return true;
}

wizardNext.addEventListener("click", () => {
  if (!validWizardStep()) return;
  wizardStep = Math.min(5, wizardStep + 1);
  showWizardStep();
});

wizardBack.addEventListener("click", () => {
  wizardStep = Math.max(1, wizardStep - 1);
  showWizardStep();
});

function formattedWizardDate() {
  if (!wizardData.date) return "";
  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(wizardData.date + "T12:00:00")
  );
}

function renderBookingSummary() {
  document.getElementById("bookingSummary").innerHTML = `
    <p><span>Categoria</span><strong>${wizardData.categoryTitle}</strong></p>
    <p><span>Serviço</span><strong>${wizardData.service}</strong></p>
    <p><span>Profissional</span><strong>${wizardData.professional}</strong></p>
    <p><span>Data</span><strong>${formattedWizardDate()}</strong></p>
    <p><span>Horário</span><strong>${wizardData.time}</strong></p>
  `;
}

function buildWhatsAppUrl() {
  const name = document.getElementById("wizardName").value.trim();
  const phone = document.getElementById("wizardPhone").value.trim();
  const notes =
    document.getElementById("wizardNotes").value.trim() || "Nenhuma";

  if (!name || !phone) {
    alert("Preencha seu nome e telefone.");
    return null;
  }

  const message = `Olá! Gostaria de solicitar um agendamento no Studio JM.

Nome: ${name}
Telefone: ${phone}
Categoria: ${wizardData.categoryTitle}
Serviço: ${wizardData.service}
Profissional: ${wizardData.professional}
Data: ${formattedWizardDate()}
Horário desejado: ${wizardData.time}
Observações: ${notes}

Por favor, confirme a disponibilidade.`;

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

wizardForm.addEventListener("submit", event => {
  event.preventDefault();
  const url = buildWhatsAppUrl();
  if (!url) return;

  whatsappFallback.href = url;

  /* Redirecionamento na mesma aba: evita bloqueio de pop-up */
  window.location.assign(url);
});

whatsappFallback.addEventListener("click", event => {
  const url = buildWhatsAppUrl();
  if (!url) {
    event.preventDefault();
    return;
  }
  whatsappFallback.href = url;
});

renderCalendar();

/* Nova tentativa quando a aba volta ao foco */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && heroVideos[heroVideoIndex]) {
    heroVideos[heroVideoIndex].muted = true;
    heroVideos[heroVideoIndex].play().catch(() => {});
  }
});

window.addEventListener("load", () => {
  const activeVideo = heroVideos.find(video => video.classList.contains("active"));
  if (activeVideo) {
    activeVideo.muted = true;
    activeVideo.play().catch(() => {});
  }
});

/* Fase 3 — Clube Studio JM */
const clubUsage={cuts:2,beards:2};
const clubPrices={Bronze:79.90,Prata:129.90,Ouro:219.90,"Family VIP":299.90};
const servicePrices={cut:45,beard:40};
let currentRecommendedPlan="Prata";

function calculateRecommendedPlan(){
  const cuts=clubUsage.cuts;
  const beards=clubUsage.beards;
  const monthlyServices=cuts+beards;
  const regularCost=cuts*servicePrices.cut+beards*servicePrices.beard;

  let plan="Bronze";
  if(monthlyServices<=2&&beards===0){
    plan="Bronze";
  }else if(monthlyServices<=4){
    plan="Prata";
  }else{
    plan="Ouro";
  }

  currentRecommendedPlan=plan;
  const saving=regularCost-clubPrices[plan];

  document.getElementById("cutsValue").textContent=cuts;
  document.getElementById("beardsValue").textContent=beards;
  document.getElementById("regularCost").textContent=regularCost.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  document.getElementById("recommendedPlan").textContent=`Plano ${plan}`;

  const message=document.getElementById("savingMessage");
  if(saving>0){
    message.textContent=`Você pode economizar aproximadamente ${saving.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} por mês.`;
  }else{
    message.textContent="Esse plano oferece praticidade, prioridade e benefícios adicionais.";
  }
}

document.querySelectorAll(".counter-control button").forEach(button=>{
  button.addEventListener("click",()=>{
    const target=button.dataset.target;
    const action=button.dataset.action;
    clubUsage[target]=Math.max(0,Math.min(15,clubUsage[target]+(action==="plus"?1:-1)));
    calculateRecommendedPlan();
  });
});

document.getElementById("chooseRecommended")?.addEventListener("click",()=>{
  const message=encodeURIComponent(`Olá! Tenho interesse no Plano ${currentRecommendedPlan} do Studio JM. Gostaria de receber mais informações.`);
  window.location.assign("./app/agendar.html");
});

document.querySelectorAll(".faq-item>button").forEach(button=>{
  button.addEventListener("click",()=>{
    const item=button.closest(".faq-item");
    document.querySelectorAll(".faq-item").forEach(other=>{
      if(other!==item)other.classList.remove("open");
    });
    item.classList.toggle("open");
  });
});

calculateRecommendedPlan();

/* Fase 5.2.2 — agendamento interno */
document.querySelectorAll('a[href="#agendar"], .open-booking').forEach(el=>{
  el.addEventListener("click",(e)=>{
    e.preventDefault();
    window.location.href="./app/agendar.html";
  });
});
document.getElementById("bookingSystem")?.addEventListener("click",(e)=>{
  e.preventDefault();
  window.location.href="./app/agendar.html";
});
