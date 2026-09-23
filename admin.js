
let rows=[];

document.addEventListener("DOMContentLoaded",init);

async function init(){
  try{
    const auth=await requireAdmin();
    if(!auth)return;
    adminReady=true;
    const {data,error}=await sb.rpc("admin_list_profiles");
    if(error)throw error;
    rows=data||[];
    const hours=await sb.from("business_hours").select("weekday,is_open,opens_at,closes_at");
    businessHours62=hours.error?null:hours.data;
    bootAdminTabs546();
    bootAdminUI62();
    bootPremiumAdminUI();
    await Promise.all([loadAgenda543(),loadToday546(),loadAdminSubscriptions532()]);
  }catch(error){
    console.error("Erro ao iniciar Admin:",error);
    feedback62("Não foi possível carregar o painel. Atualize a página para tentar novamente.",true);
  }finally{releaseAdminLoading543()}
}

function render(data=rows){renderClients62(data)}

/* ===== BLOQUEIO DE HORÁRIO — AGENDA ADMIN ===== */
let adminCristiano=null;

async function ensureAdminProfessional544(){
  if(adminCristiano)return adminCristiano;
  const {data,error}=await sb.from("professionals").select("*").eq("name","Cristiano").single();
  if(error)throw error;
  adminCristiano=data;
  return data;
}

document.getElementById("newBlock")?.addEventListener("click",async()=>{
  try{
    await ensureAdminProfessional544();
    const title=document.getElementById("agendaModalTitle");
    const body=document.getElementById("agendaModalBody");
    const modal=document.getElementById("agendaModal");
    if(!title||!body||!modal)return;

    title.textContent="Bloquear horário";
    body.innerHTML=`
      <form id="blockForm" class="form-grid">
        <label>Data<input id="blockDate" type="date" required></label>

        <label class="block-full-day-option">
          <input id="blockFullDay" type="checkbox">
          <span>Bloquear o dia inteiro</span>
        </label>

        <div class="form-row" id="blockTimeFields">
          <label>Início<input id="blockStart" type="time" value="12:00" required></label>
          <label>Fim<input id="blockEnd" type="time" value="13:00" required></label>
        </div>

        <label>Motivo
          <input id="blockReason" placeholder="Ex.: almoço, compromisso, folga, manutenção...">
        </label>

        <div class="block-modal-note">
          O período bloqueado deixa de aparecer como disponível para os clientes.
        </div>

        <button class="btn btn-gold" type="submit">Criar bloqueio</button>
      </form>`;
    document.getElementById("blockDate").value=
      activeDate62();

    const fullDay=document.getElementById("blockFullDay");
    const fields=document.getElementById("blockTimeFields");
    const startInput=document.getElementById("blockStart");
    const endInput=document.getElementById("blockEnd");

    fullDay?.addEventListener("change",()=>{
      const isFull=fullDay.checked;
      fields?.classList.toggle("disabled-fields",isFull);
      if(startInput)startInput.disabled=isFull;
      if(endInput)endInput.disabled=isFull;
    });
    document.getElementById("blockForm").addEventListener("submit",createBlock544);
    modal.classList.add("open");
  }catch(error){
    alert(error?.message||"Não foi possível preparar o bloqueio.");
  }
});

async function createBlock544(e){
  e.preventDefault();
  const submit=e.currentTarget.querySelector("button[type=submit]");
  if(submit.disabled)return;
  submit.disabled=true;

  try{
    const professional=await ensureAdminProfessional544();

    const date=document.getElementById("blockDate")?.value;
    const fullDay=document.getElementById("blockFullDay")?.checked;
    const startValue=document.getElementById("blockStart")?.value;
    const endValue=document.getElementById("blockEnd")?.value;
    const reason=document.getElementById("blockReason")?.value.trim()||"";

    if(!date)return;

    let start;
    let end;

    if(fullDay){
      start=new Date(`${date}T09:00:00-03:00`);
      end=new Date(`${date}T19:00:00-03:00`);
    }else{
      if(!startValue||!endValue)return alert("Informe o horário inicial e final.");
      start=new Date(`${date}T${startValue}:00-03:00`);
      end=new Date(`${date}T${endValue}:00-03:00`);

      if(end<=start){
        return alert("O horário final precisa ser depois do horário inicial.");
      }
    }

    const {error}=await sb.from("schedule_blocks").insert({
      professional_id:professional.id,
      starts_at:start.toISOString(),
      ends_at:end.toISOString(),
      reason:reason || (fullDay ? "Dia bloqueado" : "Horário bloqueado")
    });

    if(error)throw error;

    document.getElementById("agendaModal")?.classList.remove("open");

    await refreshAdmin62();

    feedback62(fullDay
      ? "Dia bloqueado com sucesso."
      : "Horário bloqueado com sucesso."
    );

  }catch(error){
    alert(error?.message||"Não foi possível criar o bloqueio.");
  }finally{submit.disabled=false;}
}

/* ===== AGENDA OPERACIONAL 6.0 — ENCAIXE RÁPIDO ===== */
let adminServices60=[];

function escapeAdmin60(value){
  const el=document.createElement("div");
  el.textContent=String(value??"");
  return el.innerHTML;
}

async function openNewAppointment60(presetTime=""){
  try{
    const professional=await ensureAdminProfessional544();
    const {data:services,error}=await sb.from("services")
      .select("id,name,duration_minutes").eq("active",true).order("sort_order");
    if(error)throw error;
    adminServices60=services||[];

    const clients=rows.filter(profile=>profile.role==="client")
      .sort((a,b)=>(a.full_name||"").localeCompare(b.full_name||"","pt-BR"));
    const selectedDate=activeDate62();
    const title=document.getElementById("agendaModalTitle");
    const body=document.getElementById("agendaModalBody");
    const modal=document.getElementById("agendaModal");
    if(!title||!body||!modal)return;

    title.textContent="Novo agendamento";
    body.innerHTML=`
      <form id="appointmentForm60" class="form-grid appointment-form-60">
        <label>Cliente
          <input id="appointmentClientSearch60" type="search" placeholder="Digite o nome ou WhatsApp" autocomplete="off">
          <select id="appointmentClient60" size="5" required>
            <option value="">Selecione um cliente</option>
            ${clients.map(client=>`<option value="${client.id}">${escapeAdmin60(client.full_name||"Sem nome")} · ${escapeAdmin60(client.phone||"sem telefone")}</option>`).join("")}
          </select>
        </label>
        <div class="form-row">
          <label>Data<input id="appointmentDate60" type="date" value="${selectedDate}" required></label>
          <label>Horário<input id="appointmentTime60" type="time" min="09:00" max="18:00" step="3600" value="${presetTime||"09:00"}" required></label>
        </div>
        <label>Serviço
          <select id="appointmentService60" required>
            <option value="">Selecione o serviço</option>
            ${adminServices60.map(service=>`<option value="${service.id}">${escapeAdmin60(service.name)} · ${service.duration_minutes} min</option>`).join("")}
          </select>
        </label>
        <label>Observação
          <textarea id="appointmentNotes60" placeholder="Preferência, encaixe, origem do contato..." rows="3"></textarea>
        </label>
        <div class="appointment-origin-60"><span>Origem</span><div>
          ${["Presencial","WhatsApp","Telefone","Site"].map((origin,index)=>`<label><input type="radio" name="appointmentOrigin60" value="${origin}" ${index===0?"checked":""}><span>${origin}</span></label>`).join("")}
        </div></div>
        <div id="appointmentMessage60" class="form-message"></div>
        <button class="btn btn-gold appointment-submit-60" type="submit">Confirmar agendamento</button>
      </form>`;

    const search=document.getElementById("appointmentClientSearch60");
    const select=document.getElementById("appointmentClient60");
    search?.addEventListener("input",()=>{
      const query=search.value.trim().toLowerCase();
      [...select.options].forEach((option,index)=>{
        if(index===0)return;
        option.hidden=query&&!option.textContent.toLowerCase().includes(query);
      });
    });
    document.getElementById("appointmentForm60")?.addEventListener("submit",event=>createAdminAppointment60(event,professional));
    modal.classList.add("open");
    setTimeout(()=>search?.focus(),80);
  }catch(error){
    alert(error?.message||"Não foi possível preparar o agendamento.");
  }
}

async function createAdminAppointment60(event,professional){
  event.preventDefault();
  const button=event.currentTarget.querySelector("button[type=submit]");
  const message=document.getElementById("appointmentMessage60");
  const userId=document.getElementById("appointmentClient60")?.value;
  const serviceId=document.getElementById("appointmentService60")?.value;
  const date=document.getElementById("appointmentDate60")?.value;
  const time=document.getElementById("appointmentTime60")?.value;
  const note=document.getElementById("appointmentNotes60")?.value.trim()||"";
  const origin=document.querySelector('input[name="appointmentOrigin60"]:checked')?.value||"Presencial";
  if(!userId||!serviceId||!date||!time)return;

  button.disabled=true;
  button.textContent="Agendando...";
  message?.classList.remove("show","error","success");
  const start=new Date(`${date}T${time}:00-03:00`);
  try{
  const {error}=await sb.rpc("admin_create_appointment_v60",{
    p_user_id:userId,p_professional_id:professional.id,p_service_id:serviceId,
    p_starts_at:start.toISOString(),p_notes:note||null,p_origin:origin
  });
  if(error){
    if(message){message.textContent=error.message;message.classList.add("show","error")}
    button.disabled=false;
    button.textContent="Confirmar agendamento";
    return;
  }
  document.getElementById("agendaModal")?.classList.remove("open");
  const agendaDate=document.getElementById("agendaDate543");
  if(agendaDate)agendaDate.value=date;
  await refreshAdmin62();
  feedback62("Agendamento criado.");
  }catch(error){
    if(message){message.textContent="Não foi possível agendar. Tente novamente.";message.classList.add("show","error")}
  }finally{button.disabled=false;button.textContent="Confirmar agendamento";}
}

document.getElementById("newAppointment")?.addEventListener("click",()=>openNewAppointment60());
document.getElementById("newAppointmentAgenda")?.addEventListener("click",()=>openNewAppointment60());

document.getElementById("closeAgendaModal")?.addEventListener("click",()=>document.getElementById("agendaModal")?.classList.remove("open"));
document.getElementById("agendaModal")?.addEventListener("click",e=>{
  const modal=document.getElementById("agendaModal");
  if(e.target===modal)modal.classList.remove("open");
});


/* ===== FASE 5.3.2 — GESTÃO DE ATIVAÇÃO/CICLO ===== */
async function loadAdminSubscriptions532(){
  const request=++summaryRequest62;
  try{
    const [subs,reservations,upcoming]=await Promise.all([
      allRows62(()=>sb.from("subscriptions").select("*,profiles(full_name,phone),plans(name,monthly_price)").order("selected_at",{ascending:false}).order("id")),
      allRows62(()=>sb.from("appointments").select("id,subscription_id,credits_reserved").eq("billing_mode","plan").eq("credits_charged",false).in("status",["pending","confirmed"]).order("id")),
      allRows62(()=>sb.from("appointments").select("id,user_id,starts_at,services(name)").gte("starts_at",new Date().toISOString()).in("status",["pending","confirmed"]).order("starts_at").order("id"))
    ]);
    if(request!==summaryRequest62)return;
    adminSubscriptions62=subs;
    reservedBySubscription62=new Map();
    for(const a of reservations)reservedBySubscription62.set(a.subscription_id,(reservedBySubscription62.get(a.subscription_id)||0)+Number(a.credits_reserved||0));
    upcomingByClient62=new Map();
    for(const a of upcoming)if(!upcomingByClient62.has(a.user_id))upcomingByClient62.set(a.user_id,a);
    summaryReady62=true;
    renderSubscriptions62();render(rows);renderAttention62();renderNext62();
  }catch(error){
    if(request!==summaryRequest62)return;
    summaryReady62=false;
    document.getElementById("subscriptionsBody").innerHTML='<tr><td colspan="6" class="empty">Não foi possível carregar os planos. <button class="btn btn-light" onclick="loadAdminSubscriptions532()">Tentar novamente</button></td></tr>';
    render(rows);renderAttention62();renderNext62();
    feedback62("Não foi possível atualizar planos e créditos. Tente novamente.",true);
  }
}

async function subscriptionAction(action,id){
  const labels={activate:"ativar",renew:"renovar o ciclo de",suspend:"suspender",resume:"reativar"};
  if(!confirm(`Deseja ${labels[action]} este plano?`)) return;
  const fn={
    activate:"admin_activate_subscription",
    renew:"admin_renew_subscription",
    suspend:"admin_suspend_subscription",
    resume:"admin_resume_subscription"
  }[action];
  await mutation62(`subscription:${id}`,async()=>{
    const {error}=await sb.rpc(fn,{p_subscription_id:id});
    if(error)throw error;
    await refreshAdmin62();
    feedback62("Plano atualizado.");
  });
}



/* ===== FASE 5.4.3 — AGENDA ADMINISTRATIVA ===== */
let agendaRows543=[];
let agendaBlocks545=[];

function agendaLocalDate543(date=new Date()){
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"
  }).format(date);
}
function agendaRange543(key){
  return {
    start:new Date(`${key}T00:00:00-03:00`).toISOString(),
    end:new Date(`${key}T23:59:59-03:00`).toISOString()
  };
}
function agendaStatus543(s){
  return {pending:"Pendente",confirmed:"Confirmado",completed:"Concluído",
    cancelled:"Cancelado",no_show:"Falta"}[s]||s;
}
function agendaPretty543(key){
  const d=new Date(`${key}T12:00:00-03:00`);
  const t=d.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"2-digit",month:"long"});
  return t.charAt(0).toUpperCase()+t.slice(1);
}
function agendaActions543(a){
  if(["completed","cancelled","no_show"].includes(a.status))return "";
  const b=[];
  if(a.status==="pending") b.push(`<button class="btn btn-light btn-small" onclick="agendaSetStatus543('${a.id}','confirmed')">Confirmar</button>`);
  if(!a.operational_stage||a.operational_stage==="scheduled"){
    b.push(`<button class="btn btn-arrival btn-small" onclick="agendaSetStage60('${a.id}','arrived')">✓ Cliente chegou</button>`);
  }
  if(a.operational_stage==="arrived"){
    b.push(`<button class="btn btn-dark btn-small" onclick="agendaSetStage60('${a.id}','in_service')">▶ Iniciar</button>`);
  }
  if(a.status==="confirmed"||a.operational_stage==="in_service"){
    b.push(`<button class="btn btn-gold btn-small" onclick="agendaSetStatus543('${a.id}','completed')">Concluir</button>`);
    b.push(`<button class="btn btn-light btn-small" onclick="agendaSetStatus543('${a.id}','no_show')">Falta</button>`);
  }
  b.push(`<button class="btn btn-danger btn-small" onclick="agendaSetStatus543('${a.id}','cancelled')">Cancelar</button>`);
  return `<div class="agenda-actions">${b.join("")}</div>`;
}
function renderAgenda543(){
  const q=document.getElementById("agendaSearch543").value;
  const st=document.getElementById("agendaStatus543").value;
  const key=document.getElementById("agendaDate543").value||agendaLocalDate543();
  if(loadedAgendaKey62!==key)return;
  document.getElementById("agendaDayCount543").textContent=`${agendaRows543.length} atendimento(s) • ${agendaBlocks545.length} bloqueio(s)`;
  document.getElementById("agendaPendingCount543").textContent=agendaRows543.filter(a=>a.status==="pending").length;
  document.getElementById("agendaConfirmedCount543").textContent=agendaRows543.filter(a=>a.status==="confirmed").length;
  renderTimeline62(document.getElementById("agendaTimeline543"),key,agendaRows543,agendaBlocks545,q,st);
}

/* Interações da interface operacional 6.0 */
function bootPremiumAdminUI(){
  const clock=document.getElementById("adminLiveClock");
  const updateClock=()=>{
    if(clock)clock.textContent=new Intl.DateTimeFormat("pt-BR",{
      hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"
    }).format(new Date());
  };
  updateClock();
  setInterval(updateClock,30000);

  const statusSelect=document.getElementById("agendaStatus543");
  const quickFilters=[...document.querySelectorAll("[data-agenda-status]")];
  const syncQuickFilters=()=>{
    quickFilters.forEach(button=>button.classList.toggle(
      "active",button.dataset.agendaStatus===(statusSelect?.value||"")
    ));
  };
  quickFilters.forEach(button=>button.addEventListener("click",()=>{
    if(statusSelect)statusSelect.value=button.dataset.agendaStatus||"";
    syncQuickFilters();
    renderAgenda543();
  }));
  statusSelect?.addEventListener("change",syncQuickFilters);

  setInterval(()=>{
    if(document.visibilityState!=="visible")return;
    refreshAdmin62();
  },45000);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"){
      refreshAdmin62();
    }
  });
}


async function loadAgenda543(){
  const input=document.getElementById("agendaDate543");
  if(!input||!adminReady)return;
  const request=++agendaRequest62;
  const box=document.getElementById("agendaTimeline543");
  box.setAttribute("aria-busy","true");
  if(loadedAgendaKey62!==input.value)box.innerHTML='<p class="empty">Carregando horários...</p>';
  try{
    const professional=await ensureAdminProfessional544();
    const key=input.value||agendaLocalDate543();
    input.value=key;

    const label=document.getElementById("agendaDayLabel543");
    if(label)label.textContent=agendaPretty543(key);

    const {start,end}=agendaRange543(key);

    const [appointmentsRes,blocksRes]=await Promise.all([
      sb.from("appointments")
        .select("*,profiles(full_name,phone),services(name)").eq("professional_id",professional.id)
        .gte("starts_at",start)
        .lte("starts_at",end)
        .order("starts_at",{ascending:true}),

      sb.from("schedule_blocks")
        .select("id,starts_at,ends_at,reason,professional_id").eq("professional_id",professional.id)
        .lt("starts_at",end)
        .gt("ends_at",start)
        .order("starts_at",{ascending:true})
    ]);

    if(request!==agendaRequest62||input.value!==key)return;
    if(appointmentsRes.error)throw appointmentsRes.error;
    if(blocksRes.error)throw blocksRes.error;

    loadedAgendaKey62=key;
    agendaRows543=appointmentsRes.data||[];
    agendaBlocks545=blocksRes.data||[];

    renderAgenda543();

  }catch(error){
    if(request!==agendaRequest62)return;
    console.error("Erro ao carregar agenda:",error);

    const box=document.getElementById("agendaTimeline543");
    if(box){
      box.innerHTML=`
        <div class="card agenda-empty">
          <strong>Não foi possível carregar a agenda.</strong>
          <span>${escapeAdmin60(error?.message||"Tente atualizar a página.")}</span>
        </div>`;
    }
  }finally{if(request===agendaRequest62)box.setAttribute("aria-busy","false")}
}
async function agendaSetStatus543(id,status){
  const label={confirmed:"confirmar",completed:"concluir",cancelled:"cancelar",no_show:"registrar falta neste"}[status]||"alterar";
  if(!confirm(`Deseja ${label} atendimento?`))return;
  await mutation62(`appointment:${id}`,async()=>{
    const {error}=await sb.rpc("admin_set_appointment_status",{p_appointment_id:id,p_status:status});
    if(error)throw error;
    let stageError=null;
    if(["completed","cancelled","no_show"].includes(status)){
      const result=await sb.from("appointments").update({operational_stage:"done"}).eq("id",id);
      stageError=result.error;
    }
    await refreshAdmin62();
    feedback62(stageError?"Atendimento atualizado. Não foi possível atualizar a etapa operacional.":"Atendimento atualizado.",!!stageError);
  });
}
async function agendaSetStage60(id,stage){
  await mutation62(`appointment:${id}`,async()=>{
    const {error}=await sb.from("appointments").update({operational_stage:stage,updated_at:new Date().toISOString()}).eq("id",id);
    if(error)throw error;
    await refreshAdmin62();feedback62("Etapa atualizada.");
  });
}

function agendaMove543(delta){
  const input=document.getElementById("agendaDate543");
  if(!input)return;

  const d=new Date(`${input.value||agendaLocalDate543()}T12:00:00-03:00`);
  d.setDate(d.getDate()+delta);
  input.value=agendaLocalDate543(d);
  loadAgenda543();
}


/* ===== HOTFIX 5.4.3 — LIBERAÇÃO DO OVERLAY ===== */
function releaseAdminLoading543(){
  const loadingEl=document.getElementById("loading");
  if(loadingEl){
    loadingEl.classList.add("off");
    loadingEl.style.pointerEvents="none";
    setTimeout(()=>{ loadingEl.style.display="none"; },250);
  }

  const shell=document.getElementById("adminShell")
    || document.querySelector(".app-shell");

  if(shell){
    shell.classList.remove("hidden");
  }
}


/* ===== FASE 5.4.5 — LIBERAR BLOQUEIO ===== */
async function releaseScheduleBlock545(id){
  if(!confirm("Deseja liberar este horário para novos agendamentos?"))return;
  await mutation62(`block:${id}`,async()=>{
    const {error}=await sb.from("schedule_blocks").delete().eq("id",id);
    if(error)throw error;
    await refreshAdmin62();feedback62("Horário liberado.");
  });
}

/* ===== FASE 5.4.6 — NOVO ADMIN / UX OPERACIONAL ===== */
const adminTabMeta546={hoje:["Hoje","Operação diária da Studio JM."],agenda:["Agenda","Controle de horários, bloqueios e atendimentos."],clientes:["Clientes","Cadastros e histórico dos clientes."],planos:["Planos","Gestão dos planos e créditos."]};

function openAdminTab546(tab){
  document.querySelectorAll("[data-admin-panel]").forEach(p=>p.classList.toggle("active",p.dataset.adminPanel===tab));
  document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===tab));
  const meta=adminTabMeta546[tab]||adminTabMeta546.hoje;
  document.getElementById("adminPageTitle").textContent=meta[0];
  document.getElementById("adminPageSubtitle").textContent=meta[1];
  history.replaceState(null,"",`#${tab}`);
  closeMobileSidebar();
  syncSidebar62();
}

function bootAdminTabs546(){
  const hash=location.hash.replace("#","");
  const tab=adminTabMeta546[hash]?hash:"hoje";
  document.querySelectorAll("[data-admin-tab]").forEach(btn=>btn.addEventListener("click",()=>openAdminTab546(btn.dataset.adminTab)));
  openAdminTab546(tab);
}

function localKey546(date=new Date()){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function prettyToday546(){
  const t=new Date().toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"2-digit",month:"long"});
  return t.charAt(0).toUpperCase()+t.slice(1);
}
function statusLabel546(s){return {pending:"Pendente",confirmed:"Confirmado",completed:"Concluído",cancelled:"Cancelado",no_show:"Falta"}[s]||s}

async function loadToday546(){
  if(!adminReady)return;
  const request=++todayRequest62;
  const grid=document.getElementById("todayTimeline546");
  document.getElementById("todayDate546").textContent=prettyToday546();
  grid.setAttribute("aria-busy","true");
  try{
    const professional=await ensureAdminProfessional544();
    const key=localKey546(),{start,end}=agendaRange543(key);
    const [ar,br]=await Promise.all([
      sb.from("appointments").select("*,profiles(full_name,phone),services(name)").eq("professional_id",professional.id).gte("starts_at",start).lte("starts_at",end).order("starts_at"),
      sb.from("schedule_blocks").select("id,starts_at,ends_at,reason").eq("professional_id",professional.id).lt("starts_at",end).gt("ends_at",start).order("starts_at")
    ]);
    if(request!==todayRequest62)return;
    if(ar.error||br.error)throw ar.error||br.error;
    todayAppointments62=ar.data||[];
    renderTimeline62(grid,key,todayAppointments62,br.data||[]);
    renderNext62();renderAttention62();
  }catch(error){
    if(request!==todayRequest62)return;
    todayAppointments62=null;
    grid.innerHTML='<div class="card empty">Não foi possível carregar o dia. <button class="btn btn-light" onclick="loadToday546()">Tentar novamente</button></div>';
    document.getElementById("nextAppointment546").textContent="Próximo atendimento indisponível. Atualize a agenda.";
    renderAttention62();
  }finally{if(request===todayRequest62)grid.setAttribute("aria-busy","false")}
}

/* ===== FASE 5.4.7 — ANIVERSÁRIOS NO ADMIN ===== */
function formatBirthdayAdmin547(value){
  if(!value)return "—";
  const parts=value.split("-");
  return parts.length===3 ? `${parts[2]}/${parts[1]}` : value;
}

/* Interface operacional 6.2. As mutações continuam usando os RPCs existentes. */
let adminReady=false,agendaRequest62=0,todayRequest62=0,summaryRequest62=0;
let loadedAgendaKey62="",summaryReady62=false,adminSubscriptions62=[],todayAppointments62=null;
let reservedBySubscription62=new Map(),upcomingByClient62=new Map();
let drawerRequest62=0,drawerClient62=null,drawerOpener62=null,feedbackTimer62,businessHours62=null;
const mutations62=new Set();
const el62=id=>document.getElementById(id);
const text62=value=>escapeAdmin60(value).replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const normalize62=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const time62=value=>new Date(value).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"});
const dateTime62=value=>value?new Date(value).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
const validity62=sub=>sub?.ends_at?new Date(`${sub.ends_at}T12:00:00-03:00`).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"}):sub?.status==="pending"?"Após ativação":"—";
function subscriptionStatusLabelAdmin(status){return {active:"Ativo",pending:"Aguardando ativação",suspended:"Suspenso",cancelled:"Cancelado",expired:"Expirado"}[status]||status}
function activeDate62(){return document.querySelector('[data-admin-panel="hoje"].active')?localKey546():(el62("agendaDate543").value||localKey546())}
function feedback62(message,error=false){
  const box=el62("adminFeedback");if(!box)return;
  clearTimeout(feedbackTimer62);box.textContent=message;box.hidden=false;
  box.classList.toggle("error",error);box.setAttribute("role",error?"alert":"status");
  if(!error)feedbackTimer62=setTimeout(()=>box.hidden=true,5000);
}
async function allRows62(query){
  const result=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await query().range(offset,offset+499);
    if(error)throw error;
    result.push(...(data||[]));
    if((data||[]).length<500)return result;
  }
}
async function refreshAdmin62(){
  if(!adminReady)return;
  await Promise.all([loadAgenda543(),loadToday546(),loadAdminSubscriptions532()]);
  if(el62("clientDrawer").open&&drawerClient62)await openClient62(drawerClient62,false);
}
async function mutation62(key,action){
  if(mutations62.has(key))return;
  mutations62.add(key);document.body.classList.add("admin-saving");
  try{await action()}catch(error){feedback62(error?.message||"Não foi possível salvar. Tente novamente.",true)}
  finally{mutations62.delete(key);if(!mutations62.size)document.body.classList.remove("admin-saving")}
}
function currentSub62(userId){return adminSubscriptions62.find(s=>s.user_id===userId&&["pending","active","suspended"].includes(s.status))}
function creditText62(sub){
  if(!summaryReady62)return "Indisponível";
  if(!sub||sub.status==="pending")return "—";
  const reserved=reservedBySubscription62.get(sub.id)||0;
  return `${Math.max(0,Number(sub.credits_remaining||0)-reserved)} disponíveis · ${reserved} reservados`;
}
function clientMatches62(profile,query){
  const q=normalize62(query);if(!q)return true;
  if(normalize62(`${profile.full_name||""} ${profile.email||""} ${profile.phone||""}`).includes(q))return true;
  const digits=q.replace(/\D/g,"");
  return digits.length>=3&&/^[\d\s()+.-]+$/.test(q)&&String(profile.phone||"").replace(/\D/g,"").includes(digits);
}
function renderClients62(data=rows){
  const q=el62("clientSearch534").value;
  const filtered=data.filter(p=>clientMatches62(p,q));
  el62("clientsBody").innerHTML=filtered.length?filtered.map(p=>{
    const sub=summaryReady62?currentSub62(p.id):null,upcoming=upcomingByClient62.get(p.id);
    const detail=`./cliente-detalhe.html?id=${encodeURIComponent(p.id)}`;
    return `<tr class="clickable-row" ${p.role==="client"?`data-client-href="${detail}"`:""}>
      <td data-label="Cliente"><strong>${text62(p.full_name||"Sem nome")}</strong><small>${text62(p.email||"E-mail não informado")}</small>${p.role==="client"?`<a class="client-detail-link" href="${detail}">Ver ficha</a>`:'<small>Administrador</small>'}</td>
      <td data-label="WhatsApp">${text62(p.phone||"—")}</td>
      <td data-label="Plano">${text62(summaryReady62?(sub?.plans?.name||"Sem plano"):"Indisponível")}</td>
      <td data-label="Créditos">${text62(creditText62(sub))}</td>
      <td data-label="Próximo horário">${summaryReady62?(upcoming?dateTime62(upcoming.starts_at):"Sem agendamento"):"Indisponível"}</td>
      <td data-label="Aniversário">${text62(formatBirthdayAdmin547(p.birth_date))}</td>
      <td data-label="Status"><span class="badge badge-${text62(sub?.status||"neutral")}">${text62(summaryReady62?(sub?subscriptionStatusLabelAdmin(sub.status):p.role==="admin"?"Administrador":"Sem plano"):"Indisponível")}</span></td>
    </tr>`;
  }).join(""):'<tr><td colspan="7" class="empty">Nenhum cliente encontrado. Tente outro nome, telefone ou e-mail.</td></tr>';
}
function renderSubscriptions62(){
  const query=normalize62(el62("planSearch534").value),status=el62("planStatusFilter534").value;
  document.querySelectorAll("[data-plan-status]").forEach(b=>{const active=b.dataset.planStatus===status;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active))});
  const filtered=adminSubscriptions62.filter(s=>(!status||s.status===status)&&(!query||normalize62(`${s.profiles?.full_name||""} ${s.profiles?.phone||""} ${s.plans?.name||""}`).includes(query)));
  el62("subscriptionsBody").innerHTML=filtered.length?filtered.map(s=>{
    let actions="";
    if(s.status==="pending")actions=`<button class="btn btn-gold" onclick="subscriptionAction('activate','${text62(s.id)}')">Ativar</button>`;
    if(s.status==="active")actions=`<button class="btn btn-light" onclick="subscriptionAction('renew','${text62(s.id)}')">Renovar ciclo</button><button class="btn btn-danger" onclick="subscriptionAction('suspend','${text62(s.id)}')">Suspender</button>`;
    if(s.status==="suspended")actions=`<button class="btn btn-gold" onclick="subscriptionAction('resume','${text62(s.id)}')">Reativar</button>`;
    return `<tr><td data-label="Cliente"><button class="client-name" data-client-id="${text62(s.user_id)}">${text62(s.profiles?.full_name||"Cliente")}</button></td>
      <td data-label="Plano"><strong>${text62(s.plans?.name||"—")}</strong><small>${Number(s.plans?.monthly_price||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/mês</small></td>
      <td data-label="Créditos">${text62(creditText62(s))}</td><td data-label="Validade">${validity62(s)}</td>
      <td data-label="Status"><span class="badge badge-${text62(s.status)}">${text62(subscriptionStatusLabelAdmin(s.status))}</span></td>
      <td data-label="Ações">${actions?`<details class="plan-actions"><summary>Administrar</summary><div class="table-actions">${actions}</div></details>`:"—"}</td></tr>`;
  }).join(""):'<tr><td colspan="6" class="empty">Nenhum plano encontrado para estes filtros.</td></tr>';
}
function renderTimeline62(box,key,appointments,blocks,query="",status=""){
  const q=normalize62(query),filtered=!!q||!!status;
  const weekday=new Date(`${key}T12:00:00-03:00`).getUTCDay();
  const hours=businessHours62?.find(h=>h.weekday===weekday);
  const events=appointments.map(data=>({kind:"appointment",data}));
  // Keep every hour visible, including hours covered by a full-day block.
  for(const block of blocks){
    const dayStart=+new Date(`${key}T00:00:00-03:00`),dayEnd=dayStart+86400000;
    let cursor=Math.max(dayStart,+new Date(block.starts_at));
    const end=Math.min(dayEnd,+new Date(block.ends_at));
    while(cursor<end){
      const next=Math.min(end,dayStart+(Math.floor((cursor-dayStart)/3600000)+1)*3600000);
      events.push({kind:"block",data:{...block,starts_at:new Date(cursor).toISOString(),ends_at:new Date(next).toISOString()}});
      cursor=next;
    }
  }
  // Fill the uncovered portions of each hour; partial blocks never hide a free interval.
  if(!filtered){
    for(let hour=9;hour<19;hour++){
      const start=+new Date(`${key}T${String(hour).padStart(2,"0")}:00:00-03:00`),end=start+3600000;
      const occupied=[...appointments.filter(a=>a.status!=="cancelled"),...blocks]
        .map(a=>[Math.max(start,+new Date(a.starts_at)),Math.min(end,+new Date(a.ends_at))])
        .filter(([a,b])=>a<b).sort((a,b)=>a[0]-b[0]);
      let cursor=start;
      for(const [a,b] of occupied){if(a>cursor)events.push({kind:"free",data:{starts_at:new Date(cursor).toISOString(),ends_at:new Date(a).toISOString()}});cursor=Math.max(cursor,b)}
      if(cursor<end)events.push({kind:"free",data:{starts_at:new Date(cursor).toISOString(),ends_at:new Date(end).toISOString()}});
    }
  }
  const visible=events.filter(({kind,data:a})=>{
    if(kind==="appointment")return (!status||a.status===status)&&(!q||normalize62(`${a.profiles?.full_name||""} ${a.profiles?.phone||""} ${a.services?.name||""}`).includes(q));
    return !status&&(!q||normalize62(`bloqueado ${a.reason||""}`).includes(q));
  }).sort((a,b)=>new Date(a.data.starts_at)-new Date(b.data.starts_at)||a.kind.localeCompare(b.kind));
  const expanded=new Set([...box.querySelectorAll("details[open][data-event-key]")].map(d=>d.dataset.eventKey));
  const focusKey=document.activeElement?.dataset.focusKey;
  box.innerHTML=visible.length?visible.map(({kind,data:a})=>{
    const time=`<span class="slot-time">${time62(a.starts_at)}<small>até ${time62(a.ends_at)}</small></span>`;
    if(kind==="free"){
      const startTime=time62(a.starts_at),endTime=time62(a.ends_at);
      const available=hours?.is_open&&startTime>=String(hours.opens_at).slice(0,5)&&endTime<=String(hours.closes_at).slice(0,5);
      return `<div class="schedule-row free">${time}<div class="slot-main"><strong>${available?"Livre":"Indisponível"}</strong><span>${available?"Disponível":businessHours62?"Fora do expediente":"Expediente não carregado"}</span></div><span class="free-symbol" aria-hidden="true">○</span></div>`;
    }
    const eventKey=`${kind}-${a.id}${kind==="block"?`-${a.starts_at}`:""}`;
    if(kind==="block")return `<details class="schedule-row blocked" data-event-key="${text62(eventKey)}" ${expanded.has(eventKey)?"open":""}><summary data-focus-key="${text62(eventKey)}">${time}<span class="slot-main"><strong>${text62(a.reason||"Horário bloqueado")}</strong><span>Indisponível para agendamento</span></span><span class="badge badge-blocked">Bloqueado</span><span class="row-chevron" aria-hidden="true">⌄</span></summary><div class="slot-actions"><button class="btn btn-light" onclick="releaseScheduleBlock545('${text62(a.id)}')">Liberar horário</button></div></details>`;
    const stage={arrived:"Cliente presente",in_service:"Em atendimento"}[a.operational_stage];
    return `<details class="schedule-row status-${text62(a.status)}" data-event-key="${text62(eventKey)}" ${expanded.has(eventKey)?"open":""}><summary data-focus-key="${text62(eventKey)}">${time}<span class="slot-main"><button class="client-name" data-client-id="${text62(a.user_id)}">${text62(a.profiles?.full_name||"Cliente")}</button><span>${text62(a.services?.name||"Serviço")}${stage?` · ${stage}`:""}</span></span><span class="badge badge-${text62(a.status)}">${text62(agendaStatus543(a.status))}</span><span class="row-chevron" aria-hidden="true">⌄</span></summary><div class="slot-actions"><div class="slot-context">${a.billing_mode==="plan"?`Plano · ${Number(a.credits_reserved)||0} crédito(s) reservados`:"Atendimento avulso"}${a.notes?`<p>${text62(a.notes)}</p>`:""}</div>${agendaActions543(a)}<button class="btn btn-light" data-client-id="${text62(a.user_id)}">Ver cliente</button></div></details>`;
  }).join(""):'<div class="card empty">Nenhum resultado. Ajuste a busca ou o status.</div>';
  if(!filtered)box.insertAdjacentHTML("beforeend",'<div class="schedule-end"><strong>19:00</strong><span>Fim do expediente</span></div>');
  if(focusKey)[...box.querySelectorAll("[data-focus-key]")].find(e=>e.dataset.focusKey===focusKey)?.focus({preventScroll:true});
}
function renderNext62(){
  if(!todayAppointments62)return;
  const now=Date.now();
  const next=todayAppointments62.find(a=>["pending","confirmed"].includes(a.status)&&+new Date(a.ends_at)>now);
  const box=el62("nextAppointment546");
  if(!next){box.innerHTML='<p class="ops-empty">Nenhum próximo atendimento hoje. Consulte os horários abaixo.</p>';return}
  const sub=summaryReady62?adminSubscriptions62.find(s=>s.id===next.subscription_id):null;
  box.innerHTML=`<div class="next-appointment-time">${time62(next.starts_at)}</div><div class="next-appointment-main"><button class="client-name" data-client-id="${text62(next.user_id)}">${text62(next.profiles?.full_name||"Cliente")}</button><span>${text62(next.services?.name||"Serviço")} · ${text62(statusLabel546(next.status))}</span><small>${next.billing_mode==="plan"?text62(sub?.plans?.name||"Atendimento pelo plano"):"Atendimento avulso"}</small></div><div class="next-actions"><button class="btn btn-light" data-client-id="${text62(next.user_id)}">Ver cliente</button>${next.status==="confirmed"||next.operational_stage==="in_service"?`<button class="btn btn-gold" onclick="agendaSetStatus543('${text62(next.id)}','completed')">Concluir</button>`:`<button class="btn btn-gold" onclick="agendaSetStatus543('${text62(next.id)}','confirmed')">Confirmar</button>`}</div>`;
}
function birthdays62(){
  const today=localKey546(),dates=[];
  for(let i=0;i<7;i++){const day=new Date(`${today}T12:00:00-03:00`);day.setUTCDate(day.getUTCDate()+i);dates.push(localKey546(day).slice(5))}
  return rows.filter(p=>p.role==="client"&&p.birth_date&&dates.includes(p.birth_date.slice(5,10)));
}
function renderAttention62(){
  const pending=(todayAppointments62||[]).filter(a=>a.status==="pending").length;
  const plans=summaryReady62?adminSubscriptions62.filter(s=>s.status==="pending").length:0;
  const birthdays=birthdays62();
  const items=[];
  if(pending)items.push(`<button data-attention="appointments">${pending} agendamento(s) aguardando confirmação hoje <span>→</span></button>`);
  if(plans)items.push(`<button data-attention="plans">${plans} plano(s) aguardando ativação <span>→</span></button>`);
  if(birthdays.length)items.push(`<details><summary>${birthdays.length} aniversário(s) nos próximos 7 dias</summary><div>${birthdays.map(p=>`<button data-client-id="${text62(p.id)}">${text62(p.full_name||"Cliente")} · ${text62(formatBirthdayAdmin547(p.birth_date))}</button>`).join("")}</div></details>`);
  el62("attentionBox").hidden=!items.length;el62("attentionItems").innerHTML=items.join("");
}
function renderGlobalSearch62(){
  const input=el62("globalClientSearch"),box=el62("globalClientResults"),q=input.value.trim();
  box.hidden=!q;input.setAttribute("aria-expanded",String(!!q));if(!q)return;
  const results=rows.filter(p=>p.role==="client"&&clientMatches62(p,q));
  box.innerHTML=results.length?results.map(p=>`<button data-client-id="${text62(p.id)}"><strong>${text62(p.full_name||"Cliente")}</strong><small>${text62(p.phone||p.email||"Sem contato informado")}</small></button>`).join(""):'<p>Nenhum cliente encontrado.</p>';
}
async function openClient62(id,focus=true){
  const request=++drawerRequest62,p=rows.find(p=>p.id===id),dialog=el62("clientDrawer");
  if(!p){feedback62("Cliente não encontrado. Atualize a página.",true);return}
  drawerClient62=id;
  if(!dialog.open){drawerOpener62=document.activeElement;dialog.showModal();document.body.classList.add("drawer-open")}
  el62("clientDrawerTitle").textContent=p.full_name||"Cliente";
  el62("clientDrawerBody").innerHTML='<p class="empty" role="status">Carregando ficha rápida...</p>';
  el62("globalClientResults").hidden=true;el62("globalClientSearch").setAttribute("aria-expanded","false");
  if(focus)el62("closeClientDrawer").focus();
  try{
    const [sr,next,last]=await Promise.all([
      sb.from("subscriptions").select("*,plans(*)").eq("user_id",id).in("status",["pending","active","suspended"]).order("selected_at",{ascending:false}).limit(1).maybeSingle(),
      sb.from("appointments").select("starts_at,services(name)").eq("user_id",id).in("status",["pending","confirmed"]).gte("starts_at",new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
      sb.from("appointments").select("starts_at,services(name)").eq("user_id",id).eq("status","completed").lte("starts_at",new Date().toISOString()).order("starts_at",{ascending:false}).limit(1).maybeSingle()
    ]);
    if(sr.error||next.error||last.error)throw sr.error||next.error||last.error;
    const sub=sr.data;
    let reserved=0;
    if(sub){
      const reservations=await allRows62(()=>sb.from("appointments").select("id,credits_reserved").eq("subscription_id",sub.id).eq("billing_mode","plan").eq("credits_charged",false).in("status",["pending","confirmed"]).order("id"));
      reserved=reservations.reduce((sum,a)=>sum+Number(a.credits_reserved||0),0);
    }
    if(request!==drawerRequest62||!dialog.open)return;
    const fields=[["WhatsApp",p.phone||"Não informado"],["E-mail",p.email||"Não informado"],["Aniversário",formatBirthdayAdmin547(p.birth_date)],
      ["Plano",sub?.plans?.name||"Sem plano"],["Status do plano",sub?subscriptionStatusLabelAdmin(sub.status):"Sem plano"],
      ["Créditos disponíveis",sub&&sub.status!=="pending"?Math.max(0,Number(sub.credits_remaining||0)-reserved):"—"],
      ["Créditos reservados",sub&&sub.status!=="pending"?reserved:"—"],["Validade",validity62(sub)],
      ["Próximo agendamento",next.data?`${dateTime62(next.data.starts_at)} · ${next.data.services?.name||"Serviço"}`:"Nenhum agendamento"],
      ["Último atendimento",last.data?`${dateTime62(last.data.starts_at)} · ${last.data.services?.name||"Serviço"}`:"Nenhum atendimento concluído"]];
    let phone=String(p.phone||"").replace(/\D/g,"");
    if(phone.length===10||phone.length===11)phone=`55${phone}`;
    el62("clientDrawerBody").innerHTML=`<dl class="drawer-fields">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${text62(value)}</dd></div>`).join("")}</dl><div class="drawer-actions"><a class="btn btn-gold" href="./cliente-detalhe.html?id=${encodeURIComponent(id)}">Ver ficha completa</a>${phone.length>=10&&phone.length<=15?`<a class="btn btn-light" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a>`:'<span class="field-help">WhatsApp não informado</span>'}</div>`;
  }catch(error){
    if(request!==drawerRequest62||!dialog.open)return;
    el62("clientDrawerBody").innerHTML=`<p class="empty">Não foi possível carregar os dados do cliente.</p><button class="btn btn-light" data-client-id="${text62(id)}">Tentar novamente</button><a class="btn btn-gold" href="./cliente-detalhe.html?id=${encodeURIComponent(id)}">Ver ficha completa</a>`;
  }
}
function syncSidebar62(){
  const sidebar=el62("adminSidebar"),mobile=matchMedia("(max-width: 820px)").matches,open=sidebar.classList.contains("open");
  sidebar.inert=mobile&&!open;
  document.querySelector(".mobile-menu").setAttribute("aria-expanded",String(open));
}
function bootAdminUI62(){
  const date=el62("agendaDate543");date.value=localKey546();
  date.addEventListener("change",()=>{if(date.value)loadAgenda543()});
  el62("agendaSearch543").addEventListener("input",renderAgenda543);
  el62("agendaStatus543").addEventListener("change",renderAgenda543);
  el62("agendaPrevDay543").addEventListener("click",()=>agendaMove543(-1));
  el62("agendaNextDay543").addEventListener("click",()=>agendaMove543(1));
  el62("agendaTodayBtn543").addEventListener("click",()=>{date.value=localKey546();loadAgenda543()});
  el62("goAgendaToday546").addEventListener("click",()=>{date.value=localKey546();openAdminTab546("agenda");loadAgenda543()});
  el62("newBlockAgenda546").addEventListener("click",()=>el62("newBlock").click());
  el62("clientSearch534").addEventListener("input",()=>render(rows));
  el62("planSearch534").addEventListener("input",renderSubscriptions62);
  el62("planStatusFilter534").addEventListener("change",renderSubscriptions62);
  document.querySelectorAll("[data-plan-status]").forEach(b=>b.addEventListener("click",()=>{el62("planStatusFilter534").value=b.dataset.planStatus;renderSubscriptions62()}));
  el62("globalClientSearch").addEventListener("input",renderGlobalSearch62);
  el62("globalClientSearch").addEventListener("focus",renderGlobalSearch62);
  el62("globalClientSearch").addEventListener("keydown",event=>{
    if(["ArrowDown","Enter"].includes(event.key)){event.preventDefault();el62("globalClientResults").querySelector("button")?.focus()}
    if(event.key==="Escape"){el62("globalClientResults").hidden=true;event.target.setAttribute("aria-expanded","false")}
  });
  el62("globalClientResults").addEventListener("keydown",event=>{
    const buttons=[...el62("globalClientResults").querySelectorAll("button")],index=buttons.indexOf(document.activeElement);
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();buttons[(index+(event.key==="ArrowDown"?1:buttons.length-1))%buttons.length]?.focus()}
    if(event.key==="Escape"){el62("globalClientSearch").focus();el62("globalClientResults").hidden=true;el62("globalClientSearch").setAttribute("aria-expanded","false")}
  });
  document.addEventListener("click",event=>{
    const client=event.target.closest("[data-client-id]");if(client){event.preventDefault();openClient62(client.dataset.clientId);}
    const row=event.target.closest("[data-client-href]");if(row&&!event.target.closest("a,button"))location.href=row.dataset.clientHref;
    if(!event.target.closest(".global-search")){el62("globalClientResults").hidden=true;el62("globalClientSearch").setAttribute("aria-expanded","false")}
    const attention=event.target.closest("[data-attention]");
    if(attention?.dataset.attention==="appointments"){date.value=localKey546();el62("agendaStatus543").value="pending";el62("agendaStatus543").dispatchEvent(new Event("change"));openAdminTab546("agenda");loadAgenda543()}
    if(attention?.dataset.attention==="plans"){el62("planStatusFilter534").value="pending";renderSubscriptions62();openAdminTab546("planos")}
  });
  const drawer=el62("clientDrawer");
  el62("closeClientDrawer").addEventListener("click",()=>drawer.close());
  drawer.addEventListener("click",event=>{if(event.target===drawer){const rect=drawer.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)drawer.close()}});
  drawer.addEventListener("close",()=>{drawerRequest62++;drawerClient62=null;document.body.classList.remove("drawer-open");if(drawerOpener62?.isConnected)drawerOpener62.focus()});
  document.querySelector(".sidebar-close").addEventListener("click",()=>{closeMobileSidebar();document.querySelector(".mobile-menu").focus()});
  new MutationObserver(()=>{syncSidebar62();if(el62("adminSidebar").classList.contains("open"))document.querySelector(".sidebar-close").focus()}).observe(el62("adminSidebar"),{attributes:true,attributeFilter:["class"]});
  window.addEventListener("resize",syncSidebar62);syncSidebar62();
  const modal=el62("agendaModal");let modalOpener=null;
  new MutationObserver(()=>{
    const open=modal.classList.contains("open");document.body.classList.toggle("modal-open",open);
    document.querySelector(".app-shell").inert=open;
    if(open){modalOpener=document.activeElement;modal.querySelector("input,button")?.focus()}
    else if(modalOpener?.isConnected)modalOpener.focus();
  }).observe(modal,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&modal.classList.contains("open"))modal.classList.remove("open");
    const container=modal.classList.contains("open")?modal:el62("adminSidebar").classList.contains("open")?el62("adminSidebar"):null;
    if(event.key!=="Tab"||!container)return;
    const focusable=[...container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(e=>e.getClientRects().length);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  });
}
