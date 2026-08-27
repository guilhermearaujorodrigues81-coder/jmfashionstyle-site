
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

function ensureMobileSidebarOverlay(){
  let overlay=document.querySelector(".sidebar-overlay");
  if(!overlay){
    overlay=document.createElement("div");
    overlay.className="sidebar-overlay";
    overlay.setAttribute("aria-hidden","true");
    document.body.appendChild(overlay);
  }
  return overlay;
}

function openMobileSidebar(){
  const sidebar=document.querySelector(".sidebar");
  if(!sidebar)return;

  const overlay=ensureMobileSidebarOverlay();
  sidebar.classList.add("open");
  overlay.classList.add("show");
  document.body.classList.add("sidebar-open");
}

function closeMobileSidebar(){
  const sidebar=document.querySelector(".sidebar");
  const overlay=document.querySelector(".sidebar-overlay");

  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
  document.body.classList.remove("sidebar-open");
}

function toggleMobileSidebar(){
  const sidebar=document.querySelector(".sidebar");
  if(!sidebar)return;

  if(sidebar.classList.contains("open")){
    closeMobileSidebar();
  }else{
    openMobileSidebar();
  }
}

document.addEventListener("click",async e=>{
  if(e.target.closest("[data-logout]")){
    await sb?.auth.signOut();
    location.href="./login.html";
    return;
  }

  if(e.target.closest(".mobile-menu")){
    e.preventDefault();
    e.stopPropagation();
    toggleMobileSidebar();
    return;
  }

  if(e.target.closest(".sidebar-overlay")){
    closeMobileSidebar();
    return;
  }

  /* Ao selecionar qualquer item do menu no celular, fecha automaticamente. */
  if(
    window.matchMedia("(max-width: 820px)").matches &&
    e.target.closest(".sidebar .nav-list a, .sidebar .nav-list button")
  ){
    closeMobileSidebar();
  }
});

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    closeMobileSidebar();
  }
});

window.addEventListener("resize",()=>{
  if(window.innerWidth>820){
    closeMobileSidebar();
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

  // Only allow local files inside /app.
  if(
    next.startsWith("./cliente.html") ||
    next.startsWith("./agendar.html") ||
    next.startsWith("./selecionar-plano.html")
  ){
    return next;
  }

  return defaultTarget;
}
