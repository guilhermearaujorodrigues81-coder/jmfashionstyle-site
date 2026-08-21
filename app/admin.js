
let rows=[];

document.addEventListener("DOMContentLoaded",init);

async function init(){
  try{
    const auth=await requireAdmin();
    if(!auth)return;

    const {data,error}=await sb.rpc("admin_list_profiles");
    if(error)throw error;

    rows=data||[];
    render(rows);

    // Estes cards foram removidos na 5.4.3; só atualiza se existirem.
    const clientCountEl=document.getElementById("clientCount");
    const adminCountEl=document.getElementById("adminCount");
    if(clientCountEl)clientCountEl.textContent=rows.filter(x=>x.role==="client").length;
    if(adminCountEl)adminCountEl.textContent=rows.filter(x=>x.role==="admin").length;
  }catch(error){
    console.error("Erro ao iniciar Admin:",error);
    alert(error?.message||"Não foi possível carregar o painel administrativo.");
  }finally{
    loadingOff();
    if(typeof releaseAdminLoading543==="function")releaseAdminLoading543();
  }
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
        <div class="form-row">
          <label>Início<input id="blockStart" type="time" required></label>
          <label>Fim<input id="blockEnd" type="time" required></label>
        </div>
        <label>Motivo<input id="blockReason" placeholder="Almoço, compromisso, manutenção..."></label>
        <button class="btn btn-gold" type="submit">Criar bloqueio</button>
      </form>`;
    document.getElementById("blockDate").value=agendaLocalDate543();
    document.getElementById("blockForm").addEventListener("submit",createBlock544);
    modal.classList.add("open");
  }catch(error){
    alert(error?.message||"Não foi possível preparar o bloqueio.");
  }
});

async function createBlock544(e){
  e.preventDefault();
  try{
    const professional=await ensureAdminProfessional544();
    const date=document.getElementById("blockDate")?.value;
    const startValue=document.getElementById("blockStart")?.value;
    const endValue=document.getElementById("blockEnd")?.value;
    const reason=document.getElementById("blockReason")?.value.trim()||"";

    if(!date||!startValue||!endValue)return;
    const start=new Date(`${date}T${startValue}:00-03:00`);
    const end=new Date(`${date}T${endValue}:00-03:00`);
    if(end<=start)return alert("O horário final precisa ser depois do horário inicial.");

    const {error}=await sb.from("schedule_blocks").insert({
      professional_id:professional.id,
      starts_at:start.toISOString(),
      ends_at:end.toISOString(),
      reason
    });
    if(error)throw error;

    document.getElementById("agendaModal")?.classList.remove("open");
    alert("Horário bloqueado com sucesso.");
  }catch(error){
    alert(error?.message||"Não foi possível criar o bloqueio.");
  }
}

document.getElementById("closeAgendaModal")?.addEventListener("click",()=>document.getElementById("agendaModal")?.classList.remove("open"));
document.getElementById("agendaModal")?.addEventListener("click",e=>{
  const modal=document.getElementById("agendaModal");
  if(e.target===modal)modal.classList.remove("open");
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


/* ===== FILTROS DO ADMIN ===== */
function hookAdminFilters544(){
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
    const labels={active:"ativo",pending:"aguardando ativação",suspended:"suspenso",cancelled:"cancelado",expired:"expirado"};
    document.querySelectorAll("#subscriptionsBody tr").forEach(tr=>{
      const text=tr.textContent.toLowerCase();
      tr.style.display=(text.includes(q)&&(!status||text.includes(labels[status]||status)))?"":"none";
    });
  }
  planSearch?.addEventListener("input",applyPlanFilter);
  planStatus?.addEventListener("change",applyPlanFilter);
}
document.addEventListener("DOMContentLoaded",hookAdminFilters544);


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
  const searchEl=document.getElementById("agendaSearch543");
  const statusEl=document.getElementById("agendaStatus543");
  const q=(searchEl?.value||"").trim().toLowerCase();
  const st=statusEl?.value||"";
  const rows=agendaRows543.filter(a=>{
    const text=`${a.profiles?.full_name||""} ${a.services?.name||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!st||a.status===st);
  });

  const countEl=document.getElementById("agendaDayCount543");
  const pendingEl=document.getElementById("agendaPendingCount543");
  const confirmedEl=document.getElementById("agendaConfirmedCount543");
  if(countEl)countEl.textContent=`${agendaRows543.length} atendimento${agendaRows543.length===1?"":"s"}`;
  if(pendingEl)pendingEl.textContent=agendaRows543.filter(a=>a.status==="pending").length;
  if(confirmedEl)confirmedEl.textContent=agendaRows543.filter(a=>a.status==="confirmed").length;

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
