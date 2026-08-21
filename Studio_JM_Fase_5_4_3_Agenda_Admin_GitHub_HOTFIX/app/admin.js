
let rows=[];

document.addEventListener("DOMContentLoaded",init);

async function init(){
  const auth=await requireAdmin();
  if(!auth)return;

  const {data,error}=await sb.rpc("admin_list_profiles");

  if(error){
    console.error(error);
    alert(error.message);
    loadingOff();
    return;
  }

  rows=data||[];
  render(rows);

  clientCount.textContent=rows.filter(x=>x.role==="client").length;
  adminCount.textContent=rows.filter(x=>x.role==="admin").length;
  loadingOff();
}

function render(data){
  clientsBody.innerHTML=data.length
    ? data.map(p=>`
      <tr class="clickable-row">
        <td>
          <strong>${p.full_name||"—"}</strong>
          ${p.role==="client"
            ? `<a class="client-detail-link" href="./cliente-detalhe.html?id=${p.id}">Ver ficha</a>`
            : ""}
        </td>
        <td>${p.email||"—"}</td>
        <td>${p.phone||"—"}</td>
        <td><span class="badge badge-${p.role}">${p.role==="admin"?"Administrador":"Cliente"}</span></td>
        <td>${formatDateTime(p.created_at)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5" class="empty">Nenhum cadastro encontrado.</td></tr>';
}

search.addEventListener("input",()=>{
  const q=search.value.trim().toLowerCase();

  if(!q)return render(rows);

  render(rows.filter(p=>
    (p.full_name||"").toLowerCase().includes(q) ||
    (p.email||"").toLowerCase().includes(q) ||
    (p.phone||"").toLowerCase().includes(q)
  ));
});


/* ===== FASE 5.2 — AGENDA ADMIN ===== */
let studioCalendar=null;
let adminCristiano=null;

async function loadAdminAgenda(){
  const {data:professional}=await sb.from("professionals").select("*").eq("name","Cristiano").single();
  adminCristiano=professional;

  const {data:appointments}=await sb
    .from("appointments")
    .select("*,profiles(full_name,phone),services(name),professionals(name)")
    .order("starts_at");

  const {data:blocks}=await sb
    .from("schedule_blocks")
    .select("*")
    .eq("professional_id",adminCristiano.id);

  const events=[
    ...(appointments||[]).map(a=>({
      id:a.id,
      title:`${a.profiles?.full_name||"Cliente"} • ${a.services?.name||""}`,
      start:a.starts_at,
      end:a.ends_at,
      color:{
        pending:"#d29b24",
        confirmed:"#2c8c4c",
        completed:"#3970b7",
        cancelled:"#b84d4d",
        no_show:"#777"
      }[a.status],
      extendedProps:{type:"appointment",data:a}
    })),
    ...(blocks||[]).map(b=>({
      id:b.id,
      title:`Bloqueado${b.reason?": "+b.reason:""}`,
      start:b.starts_at,
      end:b.ends_at,
      color:"#111",
      extendedProps:{type:"block",data:b}
    }))
  ];

  studioCalendar=new FullCalendar.Calendar(document.getElementById("calendar"),{
    locale:"pt-br",
    initialView:"timeGridWeek",
    firstDay:2,
    hiddenDays:[0,1],
    slotMinTime:"09:00:00",
    slotMaxTime:"19:00:00",
    allDaySlot:false,
    height:"auto",
    headerToolbar:{
      left:"prev,next today",
      center:"title",
      right:"dayGridMonth,timeGridWeek,timeGridDay"
    },
    events,
    businessHours:[{
      daysOfWeek:[2,3,4,5,6],
      startTime:"09:00",
      endTime:"19:00"
    }],
    eventClick(info){
      const p=info.event.extendedProps;
      if(p.type==="appointment")openAppointmentModal(p.data);
      else openBlockModal(p.data);
    }
  });

  studioCalendar.render();
}

function openAppointmentModal(a){
  agendaModalTitle.textContent="Agendamento";
  agendaModalBody.innerHTML=`
    <div class="profile-list">
      <div class="profile-item"><span>Cliente</span><strong>${a.profiles?.full_name||"—"}</strong></div>
      <div class="profile-item"><span>WhatsApp</span><strong>${a.profiles?.phone||"—"}</strong></div>
      <div class="profile-item"><span>Serviço</span><strong>${a.services?.name||"—"}</strong></div>
      <div class="profile-item"><span>Data</span><strong>${formatDateTime(a.starts_at)}</strong></div>
      <div class="profile-item"><span>Status</span><strong>${statusBadge(a.status)}</strong></div>
      <div class="profile-item"><span>Utilização</span><strong>${a.billing_mode==="plan" ? "Plano" : "Avulso"}</strong></div>
      <div class="profile-item"><span>Créditos</span><strong>${a.billing_mode==="plan" ? `${a.credits_reserved} reservado(s)` : "—"}</strong></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
      <button class="btn btn-gold" onclick="setAppointmentStatus('${a.id}','confirmed')">Confirmar</button>
      <button class="btn btn-dark" onclick="setAppointmentStatus('${a.id}','completed')">Concluir</button>
      <button class="btn btn-danger" onclick="setAppointmentStatus('${a.id}','cancelled')">Cancelar</button>
      <button class="btn btn-light" onclick="setAppointmentStatus('${a.id}','no_show')">Não compareceu</button>
    </div>
  `;
  agendaModal.classList.add("open");
}

async function setAppointmentStatus(id,status){
  const {error}=await sb.rpc("admin_set_appointment_status",{
    p_appointment_id:id,
    p_status:status
  });

  if(error){
    alert(error.message);
    return;
  }

  location.reload();
}

function openBlockModal(b){
  agendaModalTitle.textContent="Horário bloqueado";
  agendaModalBody.innerHTML=`
    <p><strong>${b.reason||"Sem motivo informado"}</strong></p>
    <p style="margin-top:8px">${formatDateTime(b.starts_at)} até ${formatDateTime(b.ends_at)}</p>
    <button class="btn btn-danger" style="margin-top:16px" onclick="deleteBlock('${b.id}')">Remover bloqueio</button>
  `;
  agendaModal.classList.add("open");
}

async function deleteBlock(id){
  const {error}=await sb.from("schedule_blocks").delete().eq("id",id);
  if(error)return alert(error.message);
  location.reload();
}

newBlock.addEventListener("click",()=>{
  agendaModalTitle.textContent="Bloquear horário";
  agendaModalBody.innerHTML=`
    <form id="blockForm" class="form-grid">
      <label>Data<input id="blockDate" type="date" required></label>
      <div class="form-row">
        <label>Início<input id="blockStart" type="time" required></label>
        <label>Fim<input id="blockEnd" type="time" required></label>
      </div>
      <label>Motivo<input id="blockReason" placeholder="Almoço, compromisso, manutenção..."></label>
      <button class="btn btn-gold" type="submit">Criar bloqueio</button>
    </form>
  `;

  document.getElementById("blockForm").addEventListener("submit",createBlock);
  agendaModal.classList.add("open");
});

async function createBlock(e){
  e.preventDefault();

  const start=new Date(`${blockDate.value}T${blockStart.value}:00-03:00`);
  const end=new Date(`${blockDate.value}T${blockEnd.value}:00-03:00`);

  const {error}=await sb.from("schedule_blocks").insert({
    professional_id:adminCristiano.id,
    starts_at:start.toISOString(),
    ends_at:end.toISOString(),
    reason:blockReason.value.trim()
  });

  if(error)return alert(error.message);
  location.reload();
}

closeAgendaModal.addEventListener("click",()=>agendaModal.classList.remove("open"));
agendaModal.addEventListener("click",e=>{if(e.target===agendaModal)agendaModal.classList.remove("open")});

document.addEventListener("DOMContentLoaded",()=>{
  const wait=setInterval(()=>{
    if(document.getElementById("clientsBody") && !document.getElementById("loading").classList.contains("off"))return;
    clearInterval(wait);
    loadAdminAgenda();
  },200);
});


/* ===== FASE 5.3.1 — PLANOS NO ADMIN ===== */
async function loadAdminSubscriptions(){
  const {data,error}=await sb
    .from("subscriptions")
    .select("*,profiles(full_name,phone),plans(name,monthly_price)")
    .order("selected_at",{ascending:false});

  if(error){
    console.error("Erro ao carregar planos:",error);
    return;
  }

  subscriptionsBody.innerHTML=(data||[]).length
    ? data.map(s=>`
      <tr>
        <td><strong>${s.profiles?.full_name||"—"}</strong></td>
        <td>${s.plans?.name||"—"}</td>
        <td>${Number(s.plans?.monthly_price||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
        <td><span class="badge badge-${s.status}">${subscriptionStatusLabelAdmin(s.status)}</span></td>
        <td>${formatDateTime(s.selected_at)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5" class="empty">Nenhum plano selecionado.</td></tr>';
}

function subscriptionStatusLabelAdmin(status){
  return {
    pending:"Aguardando ativação",
    active:"Ativo",
    suspended:"Suspenso",
    expired:"Expirado",
    cancelled:"Cancelado"
  }[status]||status;
}

document.addEventListener("DOMContentLoaded",()=>{
  const timer=setInterval(()=>{
    if(document.getElementById("subscriptionsBody")){
      clearInterval(timer);
      loadAdminSubscriptions();
    }
  },200);
});


/* ===== FASE 5.3.2 — GESTÃO DE ATIVAÇÃO/CICLO ===== */
async function loadAdminSubscriptions532(){
  const {data,error}=await sb.from("subscriptions")
    .select("*,profiles(full_name,phone),plans(name,monthly_price)")
    .order("selected_at",{ascending:false});
  if(error){ console.error(error); return; }

  subscriptionsBody.innerHTML=(data||[]).length ? data.map(s=>{
    let actions="";
    if(s.status==="pending") actions=`<button class="btn btn-gold btn-small" onclick="subscriptionAction('activate','${s.id}')">Ativar</button>`;
    if(s.status==="active") actions=`
      <button class="btn btn-light btn-small" onclick="subscriptionAction('renew','${s.id}')">Renovar ciclo</button>
      <button class="btn btn-danger btn-small" onclick="subscriptionAction('suspend','${s.id}')">Suspender</button>`;
    if(s.status==="suspended") actions=`<button class="btn btn-gold btn-small" onclick="subscriptionAction('resume','${s.id}')">Reativar</button>`;

    const saldo=s.status==="active" ? `${s.credits_remaining}/${s.credits_total}` : "—";
    const validade=s.ends_at ? new Date(s.ends_at+"T12:00:00").toLocaleDateString("pt-BR") : "—";
    return `<tr>
      <td><strong>${s.profiles?.full_name||"—"}</strong></td>
      <td>${s.plans?.name||"—"}</td>
      <td>${Number(s.plans?.monthly_price||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
      <td><span class="badge badge-${s.status}">${subscriptionStatusLabelAdmin(s.status)}</span></td>
      <td>${saldo}</td>
      <td>${validade}</td>
      <td><div class="table-actions">${actions}</div></td>
    </tr>`;
  }).join("") : '<tr><td colspan="7" class="empty">Nenhum plano selecionado.</td></tr>';
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
  const {error}=await sb.rpc(fn,{p_subscription_id:id});
  if(error){ alert(error.message); return; }
  await loadAdminSubscriptions532();
}

document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{ if(document.getElementById("subscriptionsBody")) loadAdminSubscriptions532(); },700);
});


/* ===== FASE 5.3.4 — RESUMO DE PLANOS NO ADMIN ===== */
async function loadPlanSummary534(){
  const {data,error}=await sb.from("subscriptions")
    .select("status,credits_remaining");
  if(error)return;

  const rows=data||[];
  adminActivePlans.textContent=rows.filter(x=>x.status==="active").length;
  if(document.getElementById("adminPendingPlans")) adminPendingPlans.textContent=rows.filter(x=>x.status==="pending").length;
  adminSuspendedPlans.textContent=rows.filter(x=>x.status==="suspended").length;
  if(document.getElementById("adminOpenCredits")) adminOpenCredits.textContent=rows
    .filter(x=>x.status==="active")
    .reduce((sum,x)=>sum+(Number(x.credits_remaining)||0),0);
}

document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{
    if(document.getElementById("planSummary534"))loadPlanSummary534();
  },700);
});


/* ===== FASE 5.4.1 — GESTÃO OPERACIONAL ===== */
function localDateKey(date=new Date()){
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Sao_Paulo",
    year:"numeric",month:"2-digit",day:"2-digit"
  }).format(date);
}

function startEndIsoForLocalDate(dateKey){
  return {
    start:new Date(`${dateKey}T00:00:00-03:00`).toISOString(),
    end:new Date(`${dateKey}T23:59:59-03:00`).toISOString()
  };
}

async function loadOperationalDashboard541(){
  const today=localDateKey();
  const {start,end}=startEndIsoForLocalDate(today);
  const weekEnd=new Date(new Date(`${today}T00:00:00-03:00`).getTime()+7*86400000).toISOString();

  const [
    todayRes,
    weekRes,
    clientsRes,
    plansRes,
    pendingRes
  ]=await Promise.all([
    sb.from("appointments")
      .select("id,starts_at,status,profiles(full_name),services(name)")
      .gte("starts_at",start).lte("starts_at",end)
      .neq("status","cancelled")
      .order("starts_at",{ascending:true}),
    sb.from("appointments")
      .select("id",{count:"exact",head:true})
      .gte("starts_at",new Date().toISOString())
      .lt("starts_at",weekEnd)
      .in("status",["pending","confirmed"]),
    sb.from("profiles").select("id",{count:"exact",head:true}),
    sb.from("subscriptions").select("id",{count:"exact",head:true}).eq("status","active"),
    sb.from("subscriptions")
      .select("id,selected_at,profiles(full_name),plans(name)")
      .eq("status","pending")
      .order("selected_at",{ascending:true})
      .limit(5)
  ]);

  const todayRows=todayRes.data||[];

  if(document.getElementById("opsTodayAppointments")) opsTodayAppointments.textContent=todayRows.length;
  if(document.getElementById("opsWeekAppointments")) opsWeekAppointments.textContent=weekRes.count||0;
  if(document.getElementById("opsClients")) opsClients.textContent=clientsRes.count||0;
  if(document.getElementById("opsActivePlans")) opsActivePlans.textContent=plansRes.count||0;

  if(document.getElementById("opsTodayList")){
    opsTodayList.innerHTML=todayRows.length
      ? todayRows.map(a=>`
        <div class="ops-row">
          <div class="ops-time">${new Date(a.starts_at).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"})}</div>
          <div class="ops-row-main">
            <strong>${a.profiles?.full_name||"Cliente"}</strong>
            <small>${a.services?.name||"Serviço"}</small>
          </div>
          <span class="badge badge-${a.status}">${statusLabel(a.status)}</span>
        </div>`).join("")
      : '<div class="ops-empty">Nenhum atendimento agendado para hoje.</div>';
  }

  if(document.getElementById("opsAttentionList")){
    const pending=pendingRes.data||[];
    const pendingAppointments=todayRows.filter(a=>a.status==="pending");

    let items=[];
    if(pendingAppointments.length){
      items.push(`<div class="ops-alert"><strong>${pendingAppointments.length} agendamento(s) pendente(s) hoje</strong><small>Confira a agenda e confirme os horários.</small></div>`);
    }
    if(pending.length){
      items.push(`<div class="ops-alert"><strong>${pending.length} plano(s) aguardando ativação</strong><small>Eles continuam visíveis na gestão de planos, sem ocupar um indicador no resumo.</small></div>`);
    }
    if(!items.length){
      items.push('<div class="ops-empty">Nenhuma pendência operacional no momento.</div>');
    }
    opsAttentionList.innerHTML=items.join("");
  }
}

function statusLabel(s){
  return {
    pending:"Pendente",confirmed:"Confirmado",completed:"Concluído",
    cancelled:"Cancelado",no_show:"Falta"
  }[s]||s;
}

function hookAdminFilters541(){
  const clientSearch=document.getElementById("clientSearch534");
  clientSearch?.addEventListener("input",()=>{
    const q=clientSearch.value.trim().toLowerCase();
    document.querySelectorAll("#clientsBody tr").forEach(tr=>{
      tr.style.display=tr.textContent.toLowerCase().includes(q)?"":"none";
    });
  });

  const planSearch=document.getElementById("planSearch534");
  const planStatus=document.getElementById("planStatusFilter534");

  function applyPlanFilter(){
    const q=(planSearch?.value||"").trim().toLowerCase();
    const status=planStatus?.value||"";
    document.querySelectorAll("#subscriptionsBody tr").forEach(tr=>{
      const text=tr.textContent.toLowerCase();
      const matchesText=text.includes(q);
      const statusLabels={
        active:"ativo",pending:"aguardando ativação",suspended:"suspenso",
        cancelled:"cancelado",expired:"expirado"
      };
      const matchesStatus=!status || text.includes(statusLabels[status]||status);
      tr.style.display=(matchesText&&matchesStatus)?"":"none";
    });
  }

  planSearch?.addEventListener("input",applyPlanFilter);
  planStatus?.addEventListener("change",applyPlanFilter);
}

document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{
    loadOperationalDashboard541();
    hookAdminFilters541();
  },900);
});



/* ===== FASE 5.4.3 — AGENDA ADMINISTRATIVA ===== */
let agendaRows543=[];

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
  if(a.status==="confirmed"){
    b.push(`<button class="btn btn-gold btn-small" onclick="agendaSetStatus543('${a.id}','completed')">Concluir</button>`);
    b.push(`<button class="btn btn-light btn-small" onclick="agendaSetStatus543('${a.id}','no_show')">Falta</button>`);
  }
  b.push(`<button class="btn btn-danger btn-small" onclick="agendaSetStatus543('${a.id}','cancelled')">Cancelar</button>`);
  return `<div class="agenda-actions">${b.join("")}</div>`;
}
function renderAgenda543(){
  const box=document.getElementById("agendaTimeline543"); if(!box)return;
  const q=(agendaSearch543?.value||"").trim().toLowerCase();
  const st=agendaStatus543?.value||"";
  const rows=agendaRows543.filter(a=>{
    const text=`${a.profiles?.full_name||""} ${a.services?.name||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!st||a.status===st);
  });

  agendaDayCount543.textContent=`${agendaRows543.length} atendimento${agendaRows543.length===1?"":"s"}`;
  agendaPendingCount543.textContent=agendaRows543.filter(a=>a.status==="pending").length;
  agendaConfirmedCount543.textContent=agendaRows543.filter(a=>a.status==="confirmed").length;

  if(!rows.length){
    box.innerHTML=`<div class="card agenda-empty"><strong>Nenhum atendimento encontrado</strong><span>${agendaRows543.length?"Ajuste os filtros para ver outros resultados.":"A agenda está livre nesta data."}</span></div>`;
    return;
  }

  box.innerHTML=rows.map(a=>{
    const time=new Date(a.starts_at).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"});
    const billing=a.billing_mode==="plan"
      ? `<span class="agenda-billing plan">Plano • ${a.credits_reserved||0} crédito(s)</span>`
      : `<span class="agenda-billing avulso">Avulso</span>`;
    return `<article class="card agenda-item status-${a.status}">
      <div class="agenda-item-time">${time}</div>
      <div class="agenda-item-main">
        <div class="agenda-item-head">
          <div><strong>${a.profiles?.full_name||"Cliente"}</strong><span>${a.services?.name||"Serviço"}</span></div>
          <span class="badge badge-${a.status}">${agendaStatus543(a.status)}</span>
        </div>
        <div class="agenda-item-meta">${billing}${a.notes?`<span class="agenda-note">Obs.: ${a.notes}</span>`:""}</div>
      </div>
      <div class="agenda-item-controls">
        ${agendaActions543(a)}
        <a class="client-detail-link agenda-client-link" href="./cliente-detalhe.html?id=${a.user_id}">Ver cliente</a>
      </div>
    </article>`;
  }).join("");
}
async function loadAgenda543(){
  const input=document.getElementById("agendaDate543");
  if(!input)return;

  try{
    const key=input.value||agendaLocalDate543();
    input.value=key;

    const dayLabel=document.getElementById("agendaDayLabel543");
    if(dayLabel) dayLabel.textContent=agendaPretty543(key);

    const {start,end}=agendaRange543(key);

    const {data,error}=await sb.from("appointments")
      .select("*,profiles(full_name,phone),services(name)")
      .gte("starts_at",start)
      .lte("starts_at",end)
      .order("starts_at",{ascending:true});

    if(error) throw error;

    agendaRows543=data||[];
    renderAgenda543();

  }catch(error){
    console.error("Erro ao carregar agenda:",error);

    const timeline=document.getElementById("agendaTimeline543");
    if(timeline){
      timeline.innerHTML=`
        <div class="card agenda-empty">
          <strong>Não foi possível carregar a agenda.</strong>
          <span>${error?.message||"Tente atualizar a página."}</span>
        </div>`;
    }
  }finally{
    releaseAdminLoading543();
  }
}
async function agendaSetStatus543(id,status){
  const label={confirmed:"confirmar",completed:"concluir",cancelled:"cancelar",no_show:"registrar falta neste"}[status]||"alterar";
  if(!confirm(`Deseja ${label} atendimento?`))return;
  const {error}=await sb.rpc("admin_set_appointment_status",{p_appointment_id:id,p_status:status});
  if(error){alert(error.message);return}
  await loadAgenda543();
}
function agendaMove543(delta){
  const input=document.getElementById("agendaDate543");
  if(!input)return;

  const d=new Date(`${input.value||agendaLocalDate543()}T12:00:00-03:00`);
  d.setDate(d.getDate()+delta);
  input.value=agendaLocalDate543(d);
  loadAgenda543();
}
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{
    const date=document.getElementById("agendaDate543");
    if(!date){
      releaseAdminLoading543();
      return;
    }

    const search=document.getElementById("agendaSearch543");
    const status=document.getElementById("agendaStatus543");
    const prev=document.getElementById("agendaPrevDay543");
    const next=document.getElementById("agendaNextDay543");
    const today=document.getElementById("agendaTodayBtn543");

    date.value=agendaLocalDate543();

    loadAgenda543()
      .catch(err=>console.error(err))
      .finally(releaseAdminLoading543);

    date.addEventListener("change",loadAgenda543);
    search?.addEventListener("input",renderAgenda543);
    status?.addEventListener("change",renderAgenda543);
    prev?.addEventListener("click",()=>agendaMove543(-1));
    next?.addEventListener("click",()=>agendaMove543(1));
    today?.addEventListener("click",()=>{
      date.value=agendaLocalDate543();
      loadAgenda543();
    });
  },500);
});


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

/* Garante que o Admin nunca fique preso em "Verificando permissões..." */
document.addEventListener("DOMContentLoaded",()=>{
  let attempts=0;

  const watchdog=setInterval(async()=>{
    attempts++;

    try{
      const {data:{session}}=await sb.auth.getSession();

      if(session){
        const {data:profile}=await sb
          .from("profiles")
          .select("role")
          .eq("id",session.user.id)
          .maybeSingle();

        if(profile?.role==="admin"){
          clearInterval(watchdog);
          releaseAdminLoading543();
          return;
        }
      }
    }catch(err){
      console.warn("Hotfix loading:",err);
    }

    /* depois de ~4s não deixamos o overlay bloquear a interface */
    if(attempts>=20){
      clearInterval(watchdog);
      releaseAdminLoading543();
    }
  },200);

  /* fallback absoluto */
  setTimeout(releaseAdminLoading543,5000);
});
