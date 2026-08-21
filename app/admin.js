
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
      <tr>
        <td><strong>${p.full_name||"—"}</strong></td>
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
