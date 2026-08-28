
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
        <td>${formatBirthdayAdmin547(p.birth_date)}</td>
        <td><span class="badge badge-${p.role}">${p.role==="admin"?"Administrador":"Cliente"}</span></td>
        <td>${formatDateTime(p.created_at)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty">Nenhum cadastro encontrado.</td></tr>';
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
      document.getElementById("agendaDate543")?.value || agendaLocalDate543();

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

    await loadAgenda543();

    alert(fullDay
      ? "Dia bloqueado com sucesso."
      : "Horário bloqueado com sucesso."
    );

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
  if(a.status==="confirmed"){
    b.push(`<button class="btn btn-gold btn-small" onclick="agendaSetStatus543('${a.id}','completed')">Concluir</button>`);
    b.push(`<button class="btn btn-light btn-small" onclick="agendaSetStatus543('${a.id}','no_show')">Falta</button>`);
  }
  b.push(`<button class="btn btn-danger btn-small" onclick="agendaSetStatus543('${a.id}','cancelled')">Cancelar</button>`);
  return `<div class="agenda-actions">${b.join("")}</div>`;
}
function renderAgenda543(){
  const box=document.getElementById("agendaTimeline543");
  if(!box)return;

  const searchEl=document.getElementById("agendaSearch543");
  const statusEl=document.getElementById("agendaStatus543");
  const q=(searchEl?.value||"").trim().toLowerCase();
  const st=statusEl?.value||"";

  const appointmentItems=agendaRows543
    .filter(a=>{
      const text=`${a.profiles?.full_name||""} ${a.services?.name||""}`.toLowerCase();
      return (!q||text.includes(q))&&(!st||a.status===st);
    })
    .map(a=>({
      type:"appointment",
      starts_at:a.starts_at,
      data:a
    }));

  const blockItems=agendaBlocks545
    .filter(b=>{
      const text=`bloqueio ${b.reason||""}`.toLowerCase();
      return (!q||text.includes(q)) && (!st);
    })
    .map(b=>({
      type:"block",
      starts_at:b.starts_at,
      data:b
    }));

  const items=[...appointmentItems,...blockItems]
    .sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));

  const countEl=document.getElementById("agendaDayCount543");
  const pendingEl=document.getElementById("agendaPendingCount543");
  const confirmedEl=document.getElementById("agendaConfirmedCount543");

  if(countEl){
    const appts=agendaRows543.length;
    const blocks=agendaBlocks545.length;
    countEl.textContent=
      `${appts} atendimento${appts===1?"":"s"} • ${blocks} bloqueio${blocks===1?"":"s"}`;
  }
  if(pendingEl)pendingEl.textContent=agendaRows543.filter(a=>a.status==="pending").length;
  if(confirmedEl)confirmedEl.textContent=agendaRows543.filter(a=>a.status==="confirmed").length;

  if(!items.length){
    box.innerHTML=`
      <div class="card agenda-empty">
        <strong>Nenhum item encontrado</strong>
        <span>${agendaRows543.length||agendaBlocks545.length
          ? "Ajuste os filtros para ver outros resultados."
          : "A agenda está totalmente livre nesta data."
        }</span>
      </div>`;
    return;
  }

  box.innerHTML=items.map(item=>{
    if(item.type==="block"){
      const b=item.data;

      const start=new Date(b.starts_at);
      const end=new Date(b.ends_at);

      const startTime=start.toLocaleTimeString("pt-BR",{
        timeZone:"America/Sao_Paulo",
        hour:"2-digit",minute:"2-digit"
      });

      const endTime=end.toLocaleTimeString("pt-BR",{
        timeZone:"America/Sao_Paulo",
        hour:"2-digit",minute:"2-digit"
      });

      return `
        <article class="card agenda-item agenda-block-item">
          <div class="agenda-item-time">
            ${startTime}
            <small>até ${endTime}</small>
          </div>

          <div class="agenda-item-main">
            <div class="agenda-item-head">
              <div>
                <strong>🔒 Horário bloqueado</strong>
                <span>${b.reason||"Sem motivo informado"}</span>
              </div>
              <span class="badge badge-blocked">Bloqueado</span>
            </div>
            <div class="agenda-item-meta">
              <span class="agenda-billing blocked">Indisponível para agendamento</span>
            </div>
          </div>

          <div class="agenda-item-controls">
            <button
              type="button"
              class="btn btn-light btn-small"
              onclick="releaseScheduleBlock545('${b.id}')">
              Liberar horário
            </button>
          </div>
        </article>`;
    }

    const a=item.data;

    const time=new Date(a.starts_at).toLocaleTimeString("pt-BR",{
      timeZone:"America/Sao_Paulo",
      hour:"2-digit",minute:"2-digit"
    });

    const billing=a.billing_mode==="plan"
      ? `<span class="agenda-billing plan">Plano • ${a.credits_reserved||0} crédito(s)</span>`
      : `<span class="agenda-billing avulso">Avulso</span>`;

    return `
      <article class="card agenda-item status-${a.status}">
        <div class="agenda-item-time">${time}</div>

        <div class="agenda-item-main">
          <div class="agenda-item-head">
            <div>
              <strong>${a.profiles?.full_name||"Cliente"}</strong>
              <span>${a.services?.name||"Serviço"}</span>
            </div>
            <span class="badge badge-${a.status}">${agendaStatus543(a.status)}</span>
          </div>

          <div class="agenda-item-meta">
            ${billing}
            ${a.notes?`<span class="agenda-note">Obs.: ${a.notes}</span>`:""}
          </div>
        </div>

        <div class="agenda-item-controls">
          ${agendaActions543(a)}
          <a
            class="client-detail-link agenda-client-link"
            href="./cliente-detalhe.html?id=${a.user_id}">
            Ver cliente
          </a>
        </div>
      </article>`;
  }).join("");
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
}

document.addEventListener("DOMContentLoaded",bootPremiumAdminUI);
async function loadAgenda543(){
  const input=document.getElementById("agendaDate543");
  if(!input)return;

  try{
    const key=input.value||agendaLocalDate543();
    input.value=key;

    const label=document.getElementById("agendaDayLabel543");
    if(label)label.textContent=agendaPretty543(key);

    const {start,end}=agendaRange543(key);

    const [appointmentsRes,blocksRes]=await Promise.all([
      sb.from("appointments")
        .select("*,profiles(full_name,phone),services(name)")
        .gte("starts_at",start)
        .lte("starts_at",end)
        .order("starts_at",{ascending:true}),

      sb.from("schedule_blocks")
        .select("id,starts_at,ends_at,reason,professional_id")
        .lt("starts_at",end)
        .gt("ends_at",start)
        .order("starts_at",{ascending:true})
    ]);

    if(appointmentsRes.error)throw appointmentsRes.error;
    if(blocksRes.error)throw blocksRes.error;

    agendaRows543=appointmentsRes.data||[];
    agendaBlocks545=blocksRes.data||[];

    renderAgenda543();

  }catch(error){
    console.error("Erro ao carregar agenda:",error);

    const box=document.getElementById("agendaTimeline543");
    if(box){
      box.innerHTML=`
        <div class="card agenda-empty">
          <strong>Não foi possível carregar a agenda.</strong>
          <span>${error?.message||"Tente atualizar a página."}</span>
        </div>`;
    }
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


/* ===== FASE 5.4.5 — LIBERAR BLOQUEIO ===== */
async function releaseScheduleBlock545(id){
  if(!confirm("Deseja liberar este horário para novos agendamentos?"))return;

  try{
    const {error}=await sb
      .from("schedule_blocks")
      .delete()
      .eq("id",id);

    if(error)throw error;

    await loadAgenda543();

  }catch(error){
    alert(error?.message||"Não foi possível liberar o horário.");
  }
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
  if(tab==="agenda")setTimeout(loadAgenda543,50);
  if(tab==="hoje")setTimeout(loadToday546,50);
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
  const grid=document.getElementById("todayTimeline546"),nextBox=document.getElementById("nextAppointment546");
  if(!grid||!nextBox)return;
  document.getElementById("todayDate546").textContent=prettyToday546();
  const key=localKey546(),{start,end}=agendaRange543(key);
  const [ar,br]=await Promise.all([
    sb.from("appointments").select("*,profiles(full_name,phone),services(name)").gte("starts_at",start).lte("starts_at",end).order("starts_at",{ascending:true}),
    sb.from("schedule_blocks").select("id,starts_at,ends_at,reason").lt("starts_at",end).gt("ends_at",start).order("starts_at",{ascending:true})
  ]);
  if(ar.error||br.error){grid.innerHTML='<div class="card agenda-empty">Não foi possível carregar o dia.</div>';return}
  const appointments=ar.data||[],blocks=br.data||[],now=Date.now();
  const next=appointments.find(a=>new Date(a.starts_at).getTime()>=now&&["pending","confirmed"].includes(a.status));
  nextBox.innerHTML=next?`<div class="next-appointment-time">${new Date(next.starts_at).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"})}</div><div class="next-appointment-main"><strong>${next.profiles?.full_name||"Cliente"}</strong><span>${next.services?.name||"Serviço"} • ${statusLabel546(next.status)}</span></div><a class="btn btn-light btn-small" href="./cliente-detalhe.html?id=${next.user_id}">Ver cliente</a>`:'<div class="ops-empty">Nenhum próximo atendimento hoje.</div>';

  const slots=[];
  for(let hour=9;hour<19;hour++){
    const ss=new Date(`${key}T${String(hour).padStart(2,"0")}:00:00-03:00`),ee=new Date(ss.getTime()+3600000);
    const a=appointments.find(x=>new Date(x.starts_at)<ee&&new Date(x.ends_at)>ss&&x.status!=="cancelled");
    const b=blocks.find(x=>new Date(x.starts_at)<ee&&new Date(x.ends_at)>ss);
    slots.push({hour,type:a?"appointment":b?"block":"free",data:a||b||null});
  }
  grid.innerHTML=slots.map(s=>{
    const label=`${String(s.hour).padStart(2,"0")}:00`;
    if(s.type==="free")return `<div class="day-slot-546 free"><div class="day-slot-time">${label}</div><div class="day-slot-main"><strong>Livre</strong><span>Disponível para agendamento</span></div></div>`;
    if(s.type==="block")return `<div class="day-slot-546 blocked"><div class="day-slot-time">${label}</div><div class="day-slot-main"><strong>🔒 Bloqueado</strong><span>${s.data.reason||"Horário indisponível"}</span></div><button class="btn btn-light btn-small" onclick="releaseScheduleBlock545('${s.data.id}')">Liberar</button></div>`;
    const a=s.data;
    return `<div class="day-slot-546 appointment status-${a.status}"><div class="day-slot-time">${label}</div><div class="day-slot-main"><strong>${a.profiles?.full_name||"Cliente"}</strong><span>${a.services?.name||"Serviço"} • ${statusLabel546(a.status)}</span></div><a class="btn btn-light btn-small" href="./cliente-detalhe.html?id=${a.user_id}">Cliente</a></div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{
    bootAdminTabs546();
    loadToday546();
    document.getElementById("goAgendaToday546")?.addEventListener("click",()=>{openAdminTab546("agenda");const d=document.getElementById("agendaDate543");if(d)d.value=localKey546();loadAgenda543()});
    document.getElementById("newBlockAgenda546")?.addEventListener("click",()=>document.getElementById("newBlock")?.click());
  },500);
});


/* ===== FASE 5.4.7 — ANIVERSÁRIOS NO ADMIN ===== */
function formatBirthdayAdmin547(value){
  if(!value)return "—";
  const parts=value.split("-");
  return parts.length===3 ? `${parts[2]}/${parts[1]}` : value;
}
