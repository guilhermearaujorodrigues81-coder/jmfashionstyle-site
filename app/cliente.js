
let authData=null;

document.addEventListener("DOMContentLoaded",init);

async function init(){
  authData=await getSessionProfile();
  if(!authData)return;

  const p=authData.profile;
  userName.textContent=p.full_name||authData.session.user.email;
  avatar.textContent=initials(p.full_name);
  profileName.textContent=p.full_name||"—";
  profileEmail.textContent=authData.session.user.email||"—";
  profilePhone.textContent=p.phone||"—";
  profileSince.textContent=formatDateTime(p.created_at);

  loadingOff();
}

editProfile.addEventListener("click",()=>{
  editName.value=authData.profile.full_name||"";
  editPhone.value=authData.profile.phone||"";
  profileModal.classList.add("open");
});

closeModal.addEventListener("click",()=>{
  profileModal.classList.remove("open");
});

profileModal.addEventListener("click",e=>{
  if(e.target===profileModal)profileModal.classList.remove("open");
});

profileForm.addEventListener("submit",async e=>{
  e.preventDefault();

  const {data,error}=await sb
    .from("profiles")
    .update({
      full_name:editName.value.trim(),
      phone:editPhone.value.trim(),
      updated_at:new Date().toISOString()
    })
    .eq("id",authData.session.user.id)
    .select()
    .single();

  if(error){
    return showMessage("profileMessage",error.message);
  }

  authData.profile=data;
  profileName.textContent=data.full_name||"—";
  profilePhone.textContent=data.phone||"—";
  userName.textContent=data.full_name||authData.session.user.email;
  avatar.textContent=initials(data.full_name);

  showMessage("profileMessage","Dados atualizados com sucesso.","success");
});


/* ===== FASE 5.2 — AGENDA ===== */
let scheduleServices=[];
let selectedService=null;
let selectedTime=null;
let cristiano=null;

async function loadAgendaBase(){
  const {data:services}=await sb.from("services").select("*").eq("active",true).order("sort_order");
  scheduleServices=services||[];

  const {data:professional}=await sb.from("professionals").select("*").eq("name","Cristiano").single();
  cristiano=professional;

  serviceList.innerHTML=scheduleServices.map(s=>`
    <button class="service-option" type="button" data-id="${s.id}">
      <span><strong>${s.name}</strong><br><small>${s.duration_minutes} minutos</small></span>
    </button>
  `).join("");

  serviceList.querySelectorAll(".service-option").forEach(btn=>{
    btn.addEventListener("click",()=>{
      serviceList.querySelectorAll(".service-option").forEach(x=>x.classList.remove("selected"));
      btn.classList.add("selected");
      selectedService=scheduleServices.find(s=>s.id===btn.dataset.id);
      validateBooking();
    });
  });

  bookingDate.min=new Date().toISOString().slice(0,10);
  bookingDate.addEventListener("change",loadSlots);
  bookButton.addEventListener("click",createAppointment);

  await loadAppointments();
}

async function loadSlots(){
  selectedTime=null;
  slotGrid.innerHTML="";
  bookButton.disabled=true;

  const date=bookingDate.value;
  if(!date)return;

  const day=new Date(date+"T12:00:00").getDay();
  if([0,1].includes(day)){
    slotGrid.innerHTML='<div class="empty" style="grid-column:1/-1">Studio fechado neste dia.</div>';
    return;
  }

  const {data:appointments}=await sb
    .from("appointments")
    .select("starts_at")
    .eq("professional_id",cristiano.id)
    .gte("starts_at",date+"T00:00:00-03:00")
    .lte("starts_at",date+"T23:59:59-03:00")
    .in("status",["pending","confirmed"]);

  const {data:blocks}=await sb
    .from("schedule_blocks")
    .select("starts_at,ends_at")
    .eq("professional_id",cristiano.id)
    .lt("starts_at",date+"T23:59:59-03:00")
    .gt("ends_at",date+"T00:00:00-03:00");

  const busy=new Set((appointments||[]).map(a=>{
    const d=new Date(a.starts_at);
    return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",hour12:false,timeZone:"America/Sao_Paulo"}).format(d);
  }));

  const blocked=(blocks||[]);

  for(let hour=9;hour<19;hour++){
    const label=String(hour).padStart(2,"0")+":00";
    const start=new Date(`${date}T${label}:00-03:00`);
    const end=new Date(start.getTime()+60*60000);

    const isBlocked=blocked.some(b=>{
      const bs=new Date(b.starts_at), be=new Date(b.ends_at);
      return start < be && end > bs;
    });

    const btn=document.createElement("button");
    btn.type="button";
    btn.className="slot";
    btn.textContent=label;
    btn.disabled=busy.has(String(hour).padStart(2,"0")) || isBlocked;

    btn.addEventListener("click",()=>{
      slotGrid.querySelectorAll(".slot").forEach(x=>x.classList.remove("selected"));
      btn.classList.add("selected");
      selectedTime=label;
      validateBooking();
    });

    slotGrid.appendChild(btn);
  }
}

function validateBooking(){
  bookButton.disabled=!(selectedService && bookingDate.value && selectedTime);
}

async function createAppointment(){
  if(!selectedService || !selectedTime || !bookingDate.value)return;

  const startLocal=`${bookingDate.value}T${selectedTime}:00-03:00`;
  const start=new Date(startLocal);
  const end=new Date(start.getTime()+60*60000);

  bookButton.disabled=true;
  bookButton.textContent="Agendando...";

  const {error}=await sb.from("appointments").insert({
    user_id:authData.session.user.id,
    professional_id:cristiano.id,
    service_id:selectedService.id,
    starts_at:start.toISOString(),
    ends_at:end.toISOString(),
    status:"pending",
    notes:bookingNotes.value.trim()
  });

  if(error){
    showMessage("bookingMessage",error.message);
  }else{
    showMessage("bookingMessage","Agendamento solicitado com sucesso. Aguarde a confirmação da Studio JM.","success");
    bookingNotes.value="";
    selectedTime=null;
    await loadSlots();
    await loadAppointments();
  }

  bookButton.textContent="Solicitar agendamento";
  validateBooking();
}

async function loadAppointments(){
  const {data}=await sb
    .from("appointments")
    .select("id,starts_at,status,services(name),professionals(name)")
    .eq("user_id",authData.session.user.id)
    .order("starts_at",{ascending:false});

  appointmentsBody.innerHTML=(data||[]).length
    ? data.map(a=>`
      <tr>
        <td>${formatDateTime(a.starts_at)}</td>
        <td>${a.services?.name||"—"}</td>
        <td>${a.professionals?.name||"—"}</td>
        <td>${statusBadge(a.status)}</td>
        <td>${["pending","confirmed"].includes(a.status)
          ? `<button class="btn btn-danger" onclick="cancelAppointment('${a.id}')">Cancelar</button>`
          : ""}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5" class="empty">Nenhum agendamento.</td></tr>';
}

async function cancelAppointment(id){
  if(!confirm("Deseja cancelar este agendamento?"))return;

  const {error}=await sb
    .from("appointments")
    .update({status:"cancelled",updated_at:new Date().toISOString()})
    .eq("id",id)
    .eq("user_id",authData.session.user.id);

  if(error){
    alert(error.message);
    return;
  }

  await loadAppointments();
  if(bookingDate.value)await loadSlots();
}

document.addEventListener("DOMContentLoaded",()=>{
  const wait=setInterval(()=>{
    if(authData){
      clearInterval(wait);
      loadAgendaBase();
    }
  },100);
});
