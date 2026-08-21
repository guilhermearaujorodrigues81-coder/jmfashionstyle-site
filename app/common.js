
const cfg = window.STUDIO_CONFIG;
const configured =
  cfg &&
  !cfg.SUPABASE_URL.includes("COLE_AQUI") &&
  !cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI");

const sb = configured
  ? supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "studiojm-auth"
      }
    })
  : null;

function showMessage(id,text,type="error"){
  const el=document.getElementById(id);
  if(!el)return;
  el.textContent=text;
  el.className=`form-message show ${type}`;
}

function initials(name){
  return (name||"JM")
    .trim()
    .split(/\s+/)
    .slice(0,2)
    .map(x=>x[0])
    .join("")
    .toUpperCase();
}

function formatDateTime(v){
  if(!v)return "—";
  return new Intl.DateTimeFormat("pt-BR",{
    dateStyle:"short",timeStyle:"short"
  }).format(new Date(v));
}

function loadingOff(){
  document.getElementById("loading")?.classList.add("off");
}

async function getSessionProfile(){
  if(!configured){
    loadingOff();
    alert("O sistema ainda precisa ser conectado ao Supabase em app/config.js.");
    return null;
  }

  const {data:{session}}=await sb.auth.getSession();
  if(!session){
    location.href="./login.html";
    return null;
  }

  const {data:profile,error}=await sb
    .from("profiles")
    .select("*")
    .eq("id",session.user.id)
    .single();

  if(error){
    console.error(error);
    alert("Não foi possível carregar seu perfil.");
    return null;
  }

  return {session,profile};
}

async function requireAdmin(){
  const auth=await getSessionProfile();
  if(!auth)return null;

  if(auth.profile.role!=="admin"){
    location.href="./cliente.html";
    return null;
  }
  return auth;
}

document.addEventListener("click",async e=>{
  if(e.target.closest("[data-logout]")){
    await sb?.auth.signOut();
    location.href="./login.html";
  }
  if(e.target.closest(".mobile-menu")){
    document.querySelector(".sidebar")?.classList.toggle("open");
  }
});

function statusLabel(status){
  return {
    pending:"Aguardando",
    confirmed:"Confirmado",
    completed:"Concluído",
    cancelled:"Cancelado",
    no_show:"Não compareceu"
  }[status] || status;
}
function statusBadge(status){
  return `<span class="badge badge-${status}">${statusLabel(status)}</span>`;
}

function getReturnTarget(defaultTarget="./cliente.html"){
  const params=new URLSearchParams(window.location.search);
  const next=params.get("next");
  if(!next)return defaultTarget;

  // Allow only same-app relative destinations.
  if(next.startsWith("./") || next.startsWith("cliente.html") || next.startsWith("agendar.html")){
    return next.startsWith("./") ? next : `./${next}`;
  }
  return defaultTarget;
}
