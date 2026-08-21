
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
