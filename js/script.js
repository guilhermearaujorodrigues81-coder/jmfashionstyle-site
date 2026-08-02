
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
