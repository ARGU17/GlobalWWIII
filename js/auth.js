"use strict";

window.NEXUS_AUTH = (() => {
  const ACCOUNTS_KEY = "nexus_local_accounts_v1";
  const SESSION_KEY = "nexus_local_session_v1";
  const ITERATIONS = 150000;
  let session = null;

  const byId = id => document.getElementById(id);
  const readJSON = (storage,key,fallback) => { try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
  const writeJSON = (storage,key,value) => { try { storage.setItem(key,JSON.stringify(value)); return true; } catch (_) { return false; } };
  const accounts = () => { const value=readJSON(localStorage,ACCOUNTS_KEY,[]); return Array.isArray(value)?value:[]; };
  const saveAccounts = value => writeJSON(localStorage,ACCOUNTS_KEY,value);
  const normalize = value => String(value||"").trim().toLowerCase();
  const cleanUsername = value => String(value||"").trim();
  const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const decode = value => Uint8Array.from(atob(value),char=>char.charCodeAt(0));
  const randomId = () => crypto.randomUUID?.() || `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const initials = value => String(value||"C").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"C";

  async function passwordHash(password,saltValue){
    const salt=saltValue?decode(saltValue):crypto.getRandomValues(new Uint8Array(16));
    const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
    const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},material,256);
    return {salt:encode(salt),hash:encode(bits)};
  }
  async function matches(password,account){const result=await passwordHash(password,account.salt);return result.hash===account.passwordHash;}
  function validPassword(value){return value.length>=8&&/[a-záéíóúñ]/.test(value)&&/[A-ZÁÉÍÓÚÑ]/.test(value)&&/\d/.test(value);}
  function currentStoredSession(){
    const persistent=readJSON(localStorage,SESSION_KEY,null),temporary=readJSON(sessionStorage,SESSION_KEY,null),candidate=persistent||temporary;
    if(!candidate)return null;
    if(candidate.guest)return {guest:true,id:"guest",displayName:"Invitado",username:"invitado"};
    const account=accounts().find(x=>x.id===candidate.userId);if(!account)return null;
    return {guest:false,id:account.id,displayName:account.displayName,username:account.username,email:account.email,createdAt:account.createdAt};
  }
  function persistSession(value,remember=true){
    try{localStorage.removeItem(SESSION_KEY)}catch(_){}try{sessionStorage.removeItem(SESSION_KEY)}catch(_){}
    if(value)writeJSON(remember?localStorage:sessionStorage,SESSION_KEY,value);
    session=currentStoredSession();
  }
  function message(id,text,type="error"){const el=byId(id);if(!el)return;el.textContent=text||"";el.dataset.type=type;}
  function setBusy(form,busy){form?.querySelectorAll("button,input").forEach(el=>el.disabled=busy);}
  function switchAuth(mode){
    const login=mode!=="register";byId("loginForm").hidden=!login;byId("registerForm").hidden=login;
    byId("authLoginTab").classList.toggle("active",login);byId("authRegisterTab").classList.toggle("active",!login);message("authMessage","");
    setTimeout(()=>byId(login?"loginIdentity":"registerName")?.focus(),0);
  }
  function renderIdentity(){
    const user=session||{guest:true,displayName:"Invitado",username:"invitado"},avatar=initials(user.displayName);
    if(byId("accountAvatar"))byId("accountAvatar").textContent=avatar;if(byId("accountName"))byId("accountName").textContent=user.displayName;
    if(byId("accountAvatarLarge"))byId("accountAvatarLarge").textContent=avatar;
    if(byId("accountTitle"))byId("accountTitle").textContent=user.guest?"Sesión de invitado":user.displayName;
    if(byId("accountSubtitle"))byId("accountSubtitle").textContent=user.guest?"Partida local temporal":`@${user.username}`;
    const details=byId("accountDetails");if(details){details.innerHTML="";const rows=user.guest?[["Tipo","Invitado"],["Guardado","Separado de las cuentas"]]:[["Usuario",`@${user.username}`],["Correo",user.email],["Miembro desde",new Date(user.createdAt).toLocaleDateString("es-ES")],["Guardado","Partida exclusiva de esta cuenta"]];for(const [label,value] of rows){const row=document.createElement("div"),span=document.createElement("span"),strong=document.createElement("strong");span.textContent=label;strong.textContent=value;row.append(span,strong);details.append(row)}}
    if(byId("changePasswordBtn"))byId("changePasswordBtn").hidden=Boolean(user.guest);
  }
  function openAccount(){renderIdentity();byId("changePasswordForm").hidden=true;message("accountMessage","");byId("accountOverlay").hidden=false;}
  function closeAccount(){byId("accountOverlay").hidden=true;byId("changePasswordForm")?.reset();}

  async function register(event){
    event.preventDefault();const form=event.currentTarget,name=String(byId("registerName").value||"").trim(),username=cleanUsername(byId("registerUsername").value),email=normalize(byId("registerEmail").value),password=byId("registerPassword").value,confirm=byId("registerConfirm").value;
    if(name.length<2)return message("authMessage","Introduce un nombre visible válido.");
    if(!/^[a-zA-Z0-9_.-]{3,24}$/.test(username))return message("authMessage","El usuario debe tener entre 3 y 24 caracteres: letras, números, punto, guion o guion bajo.");
    if(!/^\S+@\S+\.\S+$/.test(email))return message("authMessage","Introduce un correo electrónico válido.");
    if(!validPassword(password))return message("authMessage","La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.");
    if(password!==confirm)return message("authMessage","Las contraseñas no coinciden.");
    const list=accounts();if(list.some(x=>normalize(x.username)===normalize(username)))return message("authMessage","Ese nombre de usuario ya existe.");if(list.some(x=>normalize(x.email)===email))return message("authMessage","Ese correo ya está registrado.");
    setBusy(form,true);try{const credential=await passwordHash(password),account={id:randomId(),displayName:name,username,email,createdAt:new Date().toISOString(),salt:credential.salt,passwordHash:credential.hash};list.push(account);if(!saveAccounts(list))throw new Error("No se pudo guardar la cuenta");persistSession({userId:account.id},true);location.reload();}catch(error){message("authMessage",`No se pudo crear la cuenta: ${error.message}`);}finally{setBusy(form,false)}
  }
  async function login(event){
    event.preventDefault();const form=event.currentTarget,identity=normalize(byId("loginIdentity").value),password=byId("loginPassword").value,account=accounts().find(x=>normalize(x.email)===identity||normalize(x.username)===identity);
    if(!account)return message("authMessage","Usuario, correo o contraseña incorrectos.");setBusy(form,true);try{if(!(await matches(password,account)))return message("authMessage","Usuario, correo o contraseña incorrectos.");persistSession({userId:account.id},byId("loginRemember").checked);location.reload();}catch(error){message("authMessage",`No se pudo iniciar sesión: ${error.message}`);}finally{setBusy(form,false)}
  }
  async function changePassword(event){
    event.preventDefault();if(!session||session.guest)return;const form=event.currentTarget,current=byId("currentPassword").value,next=byId("newPassword").value,confirm=byId("newPasswordConfirm").value,list=accounts(),index=list.findIndex(x=>x.id===session.id),account=list[index];
    if(!account)return message("accountMessage","No se encontró la cuenta.");if(!(await matches(current,account)))return message("accountMessage","La contraseña actual no es correcta.");if(!validPassword(next))return message("accountMessage","La nueva contraseña debe tener 8 caracteres, mayúscula, minúscula y número.");if(next!==confirm)return message("accountMessage","Las nuevas contraseñas no coinciden.");
    setBusy(form,true);try{const credential=await passwordHash(next);list[index]={...account,salt:credential.salt,passwordHash:credential.hash};if(!saveAccounts(list))throw new Error("No se pudo guardar");form.reset();form.hidden=true;message("accountMessage","Contraseña actualizada correctamente.","success");}catch(error){message("accountMessage",`No se pudo actualizar: ${error.message}`);}finally{setBusy(form,false)}
  }
  function logout(){persistSession(null);location.reload();}
  function guest(){persistSession({guest:true},true);location.reload();}
  function initialize(){
    session=currentStoredSession();const overlay=byId("authOverlay");if(!overlay)return;if(session){overlay.hidden=true;renderIdentity()}else{overlay.hidden=false;switchAuth("login")}
    byId("authLoginTab")?.addEventListener("click",()=>switchAuth("login"));byId("authRegisterTab")?.addEventListener("click",()=>switchAuth("register"));byId("loginForm")?.addEventListener("submit",login);byId("registerForm")?.addEventListener("submit",register);byId("guestAccessBtn")?.addEventListener("click",guest);
    byId("accountBtn")?.addEventListener("click",openAccount);byId("closeAccountBtn")?.addEventListener("click",closeAccount);byId("accountOverlay")?.addEventListener("click",event=>{if(event.target.id==="accountOverlay")closeAccount()});byId("logoutBtn")?.addEventListener("click",logout);
    byId("changePasswordBtn")?.addEventListener("click",()=>{byId("changePasswordForm").hidden=false;byId("currentPassword")?.focus()});byId("cancelPasswordBtn")?.addEventListener("click",()=>{byId("changePasswordForm").reset();byId("changePasswordForm").hidden=true;message("accountMessage","")});byId("changePasswordForm")?.addEventListener("submit",changePassword);
  }
  function storageKey(base){return `${base}__${session?.id||"anonymous"}`;}
  document.addEventListener("DOMContentLoaded",initialize,{once:true});
  return {currentUser:()=>session,isGuest:()=>Boolean(session?.guest),storageKey,openAccount};
})();
