'use strict';
document.addEventListener('DOMContentLoaded',async()=>{
 const header=document.querySelector('.public-site-header');if(!header)return;
 const login=header.querySelector('.nav-auth-login'),signup=header.querySelector('.nav-auth-signup'),dashboard=header.querySelector('.nav-auth-dashboard'),logout=header.querySelector('.nav-auth-logout');
 try{
  const response=await fetch('api/portal.php?action=session',{cache:'no-store'});const session=await response.json();
  if(!response.ok||!session.success||!session.user)return;
  login.hidden=true;signup.hidden=true;dashboard.hidden=false;logout.hidden=false;
  const role=['student','teacher','admin'].includes(session.user.role)?session.user.role:'student';dashboard.href=role+'-dashboard.html';
  logout.addEventListener('click',async()=>{logout.disabled=true;try{const response=await fetch('api/logout.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:session.token})});const result=await response.json();if(!response.ok||!result.success)throw Error(result.message||'Unable to log out. Please retry.');location.reload();}catch(error){logout.disabled=false;alert(error.message);}});
 }catch{ /* Keep public links usable when the session service is unavailable. */ }
});
