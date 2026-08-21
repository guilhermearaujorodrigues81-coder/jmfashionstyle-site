let detailAuth=null;
function fmt(v){return v?new Date(v).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}):"—"}
function sLabel(s){return {pending:"Pendente",confirmed:"Confirmado",completed:"Concluído",cancelled:"Cancelado",no_show:"Falta",active:"Ativo",suspended:"Suspenso",expired:"Expirado"}[s]||s}
function rowsEmpty(cols,text){return `<tr><td colspan="${cols}" class="empty">${text}</td></tr>`}

(async()=>{
 if(!configured){location.href="./login.html";return}
 detailAuth=await getSessionProfile(); if(!detailAuth)return;
 if(detailAuth.profile.role!=="admin"){location.href="./cliente.html";return}
 const id=new URLSearchParams(location.search).get("id");
 if(!id){location.href="./admin.html#clientes";return}

 const {data:profiles,error}=await sb.rpc("admin_list_profiles");
 const p=(profiles||[]).find(x=>x.id===id);
 if(error||!p){alert("Cliente não encontrado.");location.href="./admin.html#clientes";return}

 detailName.textContent=p.full_name||"Cliente"; dName.textContent=p.full_name||"—";
 dEmail.textContent=p.email||"—"; dPhone.textContent=p.phone||"—"; dSince.textContent=fmt(p.created_at);

 const {data:sub}=await sb.from("subscriptions").select("*,plans(*)").eq("user_id",id)
   .in("status",["pending","active","suspended"]).order("selected_at",{ascending:false}).limit(1).maybeSingle();

 if(sub){
   dPlanName.textContent=sub.plans?.name||"Plano";
   dPlanStatus.innerHTML=`<span class="badge badge-${sub.status}">${sLabel(sub.status)}</span>`;
   dRemaining.textContent=sub.status==="pending"?"—":`${sub.credits_remaining} / ${sub.credits_total}`;
   dValidity.textContent=sub.ends_at?new Date(sub.ends_at+"T12:00:00").toLocaleDateString("pt-BR"):"Após ativação";
   const {data:r}=await sb.from("appointments").select("credits_reserved").eq("subscription_id",sub.id)
      .eq("billing_mode","plan").eq("credits_charged",false).in("status",["pending","confirmed"]);
   const reserved=(r||[]).reduce((a,x)=>a+(x.credits_reserved||0),0);
   dReserved.textContent=sub.status==="pending"?"—":reserved;
   dAvailable.textContent=sub.status==="pending"?"—":Math.max(0,sub.credits_remaining-reserved);

   const {data:l}=await sb.from("credit_ledger").select("*").eq("subscription_id",sub.id).order("created_at",{ascending:false}).limit(30);
   dLedger.innerHTML=(l||[]).length?(l||[]).map(x=>`<tr><td>${fmt(x.created_at)}</td><td>${x.description}</td><td><strong>${x.amount>0?"+":""}${x.amount}</strong></td><td>${x.balance_after??"—"}</td></tr>`).join(""):rowsEmpty(4,"Nenhuma movimentação.");
 } else {
   dPlanStatus.textContent="Cliente sem plano ativo ou pendente.";
   dAvailable.textContent=dReserved.textContent=dRemaining.textContent="—";
   dLedger.innerHTML=rowsEmpty(4,"Nenhuma movimentação.");
 }

 const {data:a}=await sb.from("appointments").select("*,services(name)").eq("user_id",id).order("starts_at",{ascending:false}).limit(50);
 const now=Date.now();
 const upcoming=(a||[]).filter(x=>new Date(x.starts_at).getTime()>=now && ["pending","confirmed"].includes(x.status)).sort((x,y)=>new Date(x.starts_at)-new Date(y.starts_at));
 const history=(a||[]).filter(x=>!upcoming.some(u=>u.id===x.id));
 dUpcoming.innerHTML=upcoming.length?upcoming.map(x=>`<tr><td>${fmt(x.starts_at)}</td><td>${x.services?.name||"—"}</td><td><span class="badge badge-${x.status}">${sLabel(x.status)}</span></td><td>${x.billing_mode==="plan"?`${x.credits_reserved} crédito(s)`:"Avulso"}</td></tr>`).join(""):rowsEmpty(4,"Nenhum próximo agendamento.");
 dHistory.innerHTML=history.length?history.map(x=>`<tr><td>${fmt(x.starts_at)}</td><td>${x.services?.name||"—"}</td><td><span class="badge badge-${x.status}">${sLabel(x.status)}</span></td><td>${x.credits_charged?`${x.credits_reserved} utilizado(s)`:(x.billing_mode==="plan"?"Reservado":"—")}</td></tr>`).join(""):rowsEmpty(4,"Nenhum atendimento no histórico.");

 loading.classList.add("off");detailShell.classList.remove("hidden");
})();