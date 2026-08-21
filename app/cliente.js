
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

  bookButton.disabled=true;
  bookButton.textContent="Agendando...";

  const {error}=await sb.rpc("create_appointment_v2",{
    p_professional_id:cristiano.id,
    p_service_id:selectedService.id,
    p_starts_at:start.toISOString(),
    p_notes:bookingNotes.value.trim() || null
  });

  if(error){
    showMessage("bookingMessage",error.message);
  }else{
    showMessage(
      "bookingMessage",
      "Agendamento solicitado com sucesso. Se o serviço estiver coberto pelo seu plano, o crédito ficou reservado e só será descontado após a conclusão.",
      "success"
    );
    bookingNotes.value="";
    selectedTime=null;
    await loadSlots();
    await loadAppointments();
    await loadMyPlan();
    await loadCreditLedger();
    creditQuoteBox?.classList.add("hidden");
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


/* ===== FASE 5.3.1 — PLANO VINCULADO À CONTA ===== */
function subscriptionStatusLabel(status){
  return {
    pending:"Aguardando ativação",
    active:"Ativo",
    suspended:"Suspenso",
    expired:"Expirado",
    cancelled:"Cancelado"
  }[status]||status;
}

async function loadMyPlan(){
  const {data:subscription,error}=await sb
    .from("subscriptions")
    .select("*,plans(*)")
    .eq("user_id",authData.session.user.id)
    .in("status",["pending","active","suspended"])
    .order("selected_at",{ascending:false})
    .limit(1)
    .maybeSingle();

  if(error){
    console.error("Erro ao carregar plano:",error);
    return;
  }

  if(!subscription){
    noPlanState.classList.remove("hidden");
    planState.classList.add("hidden");
    return;
  }

  noPlanState.classList.add("hidden");
  planState.classList.remove("hidden");

  const plan=subscription.plans;
  accountPlanName.textContent=plan?.name||"Plano";
  accountPlanPrice.textContent=Number(plan?.monthly_price||0)
    .toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+"/mês";

  accountPlanStatus.textContent=subscriptionStatusLabel(subscription.status);
  accountCredits.textContent=subscription.status==="active"
    ? `${subscription.credits_remaining} / ${subscription.credits_total}`
    : `${subscription.credits_total} previstos`;

  accountValidity.textContent=(subscription.starts_at && subscription.ends_at)
    ? `${formatDateTime(subscription.starts_at+"T12:00:00")} → ${formatDateTime(subscription.ends_at+"T12:00:00")}`
    : "Após ativação";

  accountStatusBadge.innerHTML=`<span class="badge badge-${subscription.status}">${subscriptionStatusLabel(subscription.status)}</span>`;

  if(subscription.status==="pending"){
    pendingPlanActions.classList.remove("hidden");
  }else{
    pendingPlanActions.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  const timer=setInterval(()=>{
    if(authData){
      clearInterval(timer);
      loadMyPlan();
    }
  },100);
});

cancelPlanSelection?.addEventListener("click",async()=>{
  if(!confirm("Cancelar sua solicitação de plano?"))return;

  const {error}=await sb.rpc("cancel_pending_subscription");
  if(error){
    alert(error.message);
    return;
  }

  await loadMyPlan();
});


/* ===== FASE 5.3.2 — DETALHES DO CICLO ===== */
async function refreshPlanCycle532(){
  if(!authData)return;
  const {data:s}=await sb.from("subscriptions")
    .select("*,plans(*)")
    .eq("user_id",authData.session.user.id)
    .in("status",["pending","active","suspended"])
    .order("selected_at",{ascending:false}).limit(1).maybeSingle();
  if(!s)return;

  if(s.status==="active" || s.status==="suspended"){
    accountCredits.textContent=`${s.credits_remaining} de ${s.credits_total}`;
    if(s.ends_at){
      const end=new Date(s.ends_at+"T23:59:59");
      const days=Math.max(0,Math.ceil((end-new Date())/86400000));
      accountValidity.textContent=`${new Date(s.ends_at+"T12:00:00").toLocaleDateString("pt-BR")} • ${days} dia${days===1?"":"s"}`;
    }
  }
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(refreshPlanCycle532,800));


/* ===== FASE 5.3.3 — CRÉDITOS + AGENDA ===== */
async function loadCreditQuote(){
  if(!selectedService || !selectedTime || !bookingDate.value){
    creditQuoteBox?.classList.add("hidden");
    return;
  }

  const start=new Date(`${bookingDate.value}T${selectedTime}:00-03:00`);

  const {data,error}=await sb.rpc("get_booking_credit_quote",{
    p_service_id:selectedService.id,
    p_starts_at:start.toISOString()
  });

  if(error || !data?.length){
    creditQuoteBox?.classList.add("hidden");
    return;
  }

  const q=data[0];
  creditQuoteBox.classList.remove("hidden");

  if(q.billing_mode==="plan"){
    creditQuoteBox.classList.add("using-plan");
    creditQuoteTitle.textContent=`Usar ${q.plan_name}`;
    creditQuoteMessage.textContent=q.message;
    creditQuoteBalance.textContent=`${q.credits_available} disponível(is)`;
  }else{
    creditQuoteBox.classList.remove("using-plan");
    creditQuoteTitle.textContent="Atendimento avulso";
    creditQuoteMessage.textContent=q.message;
    creditQuoteBalance.textContent=q.plan_name
      ? `${q.credits_available} crédito(s) livre(s)`
      : "";
  }
}

async function loadCreditLedger(){
  if(!authData)return;

  const {data,error}=await sb
    .from("credit_ledger")
    .select("id,amount,balance_after,description,created_at,appointments(services(name))")
    .order("created_at",{ascending:false});

  if(error){
    console.error("Erro no extrato:",error);
    return;
  }

  creditLedgerBody.innerHTML=(data||[]).length
    ? data.map(x=>{
        const service=x.appointments?.services?.name;
        const desc=service ? `${x.description} • ${service}` : x.description;
        const sign=x.amount>0?"+":"";
        return `<tr>
          <td>${formatDateTime(x.created_at)}</td>
          <td>${desc}</td>
          <td><strong>${sign}${x.amount}</strong></td>
          <td>${x.balance_after ?? "—"}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="4" class="empty">Nenhum movimento de crédito ainda.</td></tr>';
}

function hookCreditQuoteEvents(){
  bookingDate?.addEventListener("change",()=>setTimeout(loadCreditQuote,100));

  serviceList?.addEventListener("click",()=>{
    setTimeout(loadCreditQuote,100);
  });

  slotGrid?.addEventListener("click",e=>{
    if(e.target.closest(".slot")){
      setTimeout(loadCreditQuote,100);
    }
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  const timer=setInterval(()=>{
    if(authData && document.getElementById("creditLedgerBody")){
      clearInterval(timer);
      loadCreditLedger();
      hookCreditQuoteEvents();
    }
  },120);
});


async function loadReservedCreditSummary(){
  if(!authData)return;

  const {data:s}=await sb.from("subscriptions")
    .select("id,credits_remaining,status")
    .eq("user_id",authData.session.user.id)
    .eq("status","active")
    .maybeSingle();

  if(!s)return;

  const {data:a}=await sb.from("appointments")
    .select("credits_reserved")
    .eq("subscription_id",s.id)
    .eq("billing_mode","plan")
    .eq("credits_charged",false)
    .in("status",["pending","confirmed"]);

  const reserved=(a||[]).reduce((sum,x)=>sum+(x.credits_reserved||0),0);
  const available=Math.max(0,(s.credits_remaining||0)-reserved);

  if(document.getElementById("accountCredits")){
    accountCredits.textContent=`${available} disponíveis`;
    accountCredits.title=`Saldo: ${s.credits_remaining} • Reservados: ${reserved}`;
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  const timer=setInterval(()=>{
    if(authData){
      clearInterval(timer);
      setTimeout(loadReservedCreditSummary,500);
    }
  },120);
});


/* ===== FASE 5.3.4 — EXPERIÊNCIA DE PLANOS ===== */
async function renderPlanExperience534(){
  if(!authData)return;

  const {data:s,error}=await sb.from("subscriptions")
    .select("*,plans(*)")
    .eq("user_id",authData.session.user.id)
    .in("status",["pending","active","suspended"])
    .order("selected_at",{ascending:false})
    .limit(1)
    .maybeSingle();

  if(error || !s)return;

  const plan=s.plans||{};
  let reserved=0;

  if(s.status==="active" || s.status==="suspended"){
    const {data:a}=await sb.from("appointments")
      .select("credits_reserved")
      .eq("subscription_id",s.id)
      .eq("billing_mode","plan")
      .eq("credits_charged",false)
      .in("status",["pending","confirmed"]);

    reserved=(a||[]).reduce((sum,x)=>sum+(Number(x.credits_reserved)||0),0);
  }

  const total=Number(s.credits_total)||0;
  const remaining=Number(s.credits_remaining)||0;
  const available=Math.max(0,remaining-reserved);
  const consumed=Math.max(0,total-remaining);
  const usage=total ? Math.min(100,Math.round((consumed/total)*100)) : 0;

  if(document.getElementById("creditsAvailable532"))
    creditsAvailable532.textContent=s.status==="pending" ? "—" : available;

  if(document.getElementById("creditsReserved532"))
    creditsReserved532.textContent=s.status==="pending" ? "—" : reserved;

  if(document.getElementById("accountCredits"))
    accountCredits.textContent=s.status==="pending" ? `${total} previstos` : `${remaining} de ${total}`;

  if(document.getElementById("creditUsageText"))
    creditUsageText.textContent=s.status==="pending" ? "Aguardando ativação" : `${consumed} utilizado(s)`;

  if(document.getElementById("creditUsageBar"))
    creditUsageBar.style.width=`${usage}%`;

  const benefits=[];
  if(plan.freestyles) benefits.push(`${plan.freestyles} freestyle${plan.freestyles>1?"s":""}`);
  if(plan.hydrations) benefits.push(`${plan.hydrations} hidratação${plan.hydrations>1?"ões":""}`);
  if(plan.discount_percent) benefits.push(`${Number(plan.discount_percent)}% extras`);
  if(plan.family_members>1) benefits.push(`até ${plan.family_members} pessoas`);

  if(document.getElementById("planBenefits532"))
    planBenefits532.textContent=benefits.length ? benefits.join(" • ") : "Créditos do plano";

  const attention=document.getElementById("planAttention532");
  if(attention){
    attention.classList.add("hidden");
    attention.className="plan-attention hidden";

    if(s.status==="pending"){
      attention.textContent="Seu plano foi escolhido e está aguardando ativação. Os créditos serão liberados após a ativação.";
      attention.className="plan-attention warning";
    }else if(s.status==="suspended"){
      attention.textContent="Seu plano está suspenso. Novos atendimentos não utilizarão créditos até a reativação.";
      attention.className="plan-attention danger";
    }else if(s.status==="active" && available===0){
      attention.textContent=reserved>0
        ? "Todos os seus créditos livres estão reservados em agendamentos. Cancelamentos liberam a reserva."
        : "Você utilizou todos os créditos disponíveis deste ciclo.";
      attention.className="plan-attention warning";
    }else if(s.status==="active" && s.ends_at){
      const end=new Date(s.ends_at+"T23:59:59");
      const days=Math.max(0,Math.ceil((end-new Date())/86400000));
      if(days<=5){
        attention.textContent=`Seu ciclo termina em ${days} dia${days===1?"":"s"}.`;
        attention.className="plan-attention info";
      }
    }
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  const timer=setInterval(()=>{
    if(authData){
      clearInterval(timer);
      setTimeout(renderPlanExperience534,650);
    }
  },120);
});
