
let authData=null;

document.addEventListener("DOMContentLoaded",init);

async function init(){
  authData=await getSessionProfile();
  if(!authData)return;

  const p=authData.profile;
  userName.textContent=p.full_name||authData.session.user.email;
  avatar.textContent=initials(p.full_name);
  profileName.textContent=p.full_name||"—";
  profileEmail.textContent=authData.session.user.email||"—";
  profilePhone.textContent=p.phone||"—";
  profileSince.textContent=formatDateTime(p.created_at);

  loadingOff();
}

editProfile.addEventListener("click",()=>{
  editName.value=authData.profile.full_name||"";
  editPhone.value=authData.profile.phone||"";
  profileModal.classList.add("open");
});

closeModal.addEventListener("click",()=>{
  profileModal.classList.remove("open");
});

profileModal.addEventListener("click",e=>{
  if(e.target===profileModal)profileModal.classList.remove("open");
});

profileForm.addEventListener("submit",async e=>{
  e.preventDefault();

  const {data,error}=await sb
    .from("profiles")
    .update({
      full_name:editName.value.trim(),
      phone:editPhone.value.trim(),
      updated_at:new Date().toISOString()
    })
    .eq("id",authData.session.user.id)
    .select()
    .single();

  if(error){
    return showMessage("profileMessage",error.message);
  }

  authData.profile=data;
  profileName.textContent=data.full_name||"—";
  profilePhone.textContent=data.phone||"—";
  userName.textContent=data.full_name||authData.session.user.email;
  avatar.textContent=initials(data.full_name);

  showMessage("profileMessage","Dados atualizados com sucesso.","success");
});
