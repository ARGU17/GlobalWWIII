"use strict";

const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const html=read("index.html"),auth=read("js/auth.js"),app=read("js/app.js");
const assert=(value,message)=>{if(!value)throw new Error(message)};

for(const id of ["authOverlay","loginForm","registerForm","guestAccessBtn","accountOverlay","changePasswordForm","logoutBtn"]){
  assert(html.includes(`id="${id}"`),`Falta el control de cuenta ${id}`);
}
assert(/js\/auth\.js\?v=(?:5\.0\.0-r1|5\.1\.0-r1)/.test(html),"El módulo de autenticación no se carga o carece de versión");
assert(auth.includes('name:"PBKDF2"')&&auth.includes('hash:"SHA-256"'),"La contraseña no usa PBKDF2-SHA-256");
assert(auth.includes("const ITERATIONS = 150000"),"Número de iteraciones PBKDF2 inesperado");
assert(auth.includes("crypto.getRandomValues(new Uint8Array(16))"),"Falta sal criptográfica aleatoria");
assert(auth.includes("passwordHash:credential.hash")&&!auth.includes("password:password"),"Las cuentas podrían conservar contraseñas en texto plano");
assert(auth.includes("localStorage")&&auth.includes("sessionStorage"),"Faltan sesiones persistentes o temporales");
assert(auth.includes("guest:true")&&auth.includes("changePassword"),"Faltan modo invitado o cambio de contraseña");
assert(app.includes("NEXUS_AUTH?.storageKey")&&app.includes("nexus_alpha_v2_0_0_save"),"Los guardados no están aislados por cuenta");
assert(app.includes("nexus_alpha_v1_9_0_save"),"Falta migración desde v1.9.0");
assert(app.includes("nexus_alpha_v1_8_2_save"),"Falta migración desde v1.8.2");
assert(app.includes("nexus_alpha_v1_8_1_save"),"Falta migración desde v1.8.1");
assert(app.includes("LEGACY_CLAIM_KEY")&&app.includes("!user.guest"),"La migración heredada no está limitada a una cuenta registrada");

console.log(JSON.stringify({ok:true,version:"5.1.0-alpha",accounts:"local",passwords:"PBKDF2-SHA-256",iterations:150000,isolatedSaves:true},null,2));
