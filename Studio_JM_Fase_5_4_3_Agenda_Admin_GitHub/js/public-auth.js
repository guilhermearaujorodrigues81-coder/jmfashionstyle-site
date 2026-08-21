
const publicCfg = window.STUDIO_CONFIG;

const publicSupabase = (
  publicCfg &&
  !publicCfg.SUPABASE_URL.includes("COLE_AQUI") &&
  !publicCfg.SUPABASE_ANON_KEY.includes("COLE_AQUI")
)
  ? supabase.createClient(
      publicCfg.SUPABASE_URL,
      publicCfg.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "studiojm-auth"
        }
      }
    )
  : null;

async function updatePublicAuthUI() {
  if (!publicSupabase) return;

  const { data: { session } } = await publicSupabase.auth.getSession();

  const clientLinks = document.querySelectorAll(
    'a[href="./app/login.html"], a[data-client-area]'
  );

  if (!session) {
    clientLinks.forEach(link => {
      link.href = "./app/login.html";
      if (link.dataset.clientArea !== undefined) {
        link.textContent = "Área do cliente";
      }
    });
    document.body.classList.remove("is-authenticated");
    return;
  }

  document.body.classList.add("is-authenticated");

  let role = "client";
  const { data: profile } = await publicSupabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profile?.role) role = profile.role;

  const target = role === "admin"
    ? "./app/admin.html"
    : "./app/cliente.html";

  clientLinks.forEach(link => {
    link.href = target;
    if (link.dataset.clientArea !== undefined) {
      link.textContent = role === "admin"
        ? "Painel Admin"
        : "Minha conta";
    }
  });
}

document.addEventListener("DOMContentLoaded", updatePublicAuthUI);

if (publicSupabase) {
  publicSupabase.auth.onAuthStateChange(() => {
    updatePublicAuthUI();
  });
}
