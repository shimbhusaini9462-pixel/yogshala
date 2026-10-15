'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function check(pageRole,activeRole){
 const elements=new Map(),requests=[],redirects=[];
 function get(id){if(!elements.has(id))elements.set(id,{hidden:false,listeners:{},addEventListener(name,handler){this.listeners[name]=handler;},scrollIntoView(){},replaceChildren(){this.cleared=true;},querySelectorAll(){return [];},reset(){},focus(){}});return elements.get(id);}
 const location={hostname:'127.0.0.1',protocol:'http:',port:'8085',pathname:'/'+pageRole+'-dashboard.html',search:'',hash:'',replace(url){redirects.push(url);}};
 let signedIn=true;
 const document={body:{dataset:{dashboardRole:pageRole},classList:{add(){},remove(){}}},addEventListener(event,handler){if(event==='DOMContentLoaded')handler();},getElementById:get,querySelectorAll(){return [];}};
 vm.runInNewContext(fs.readFileSync('online-classes.js','utf8'),{document,window:{location,YogshalaVideo:{close(){}}},location,URLSearchParams,Intl,Date,setInterval(){},fetch:async(url,options)=>{
  requests.push(url);
  if(url==='api/logout.php'){assert.equal(JSON.parse(options.body).token,'session-token');signedIn=false;return {ok:true,json:async()=>({success:true})};}
  return {ok:signedIn,json:async()=>signedIn?{success:true,user:{name:'Test',role:activeRole},token:'session-token'}:{success:false,message:'Login required'}};
 }});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(redirects.length,0);
 assert.equal(get('account-switch').hidden,false);
 assert.equal(get('account-login').hidden,true);
 assert.equal(get('account-dashboard').hidden,true);
 assert(get('dashboard-content').cleared);
 assert(!requests.some(url=>url.includes('action=dashboard')));
 assert.equal(get('panel-title').textContent,pageRole[0].toUpperCase()+pageRole.slice(1)+' Login');
 get('switch-account').listeners.click({target:get('switch-account')});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(get('account-switch').hidden,true);assert.equal(get('account-login').hidden,false);
 assert.equal(get('show-signup').hidden,pageRole!=='student');
}
(async()=>{
 for(const page of ['student','teacher','admin']){
  const html=fs.readFileSync(page+'-dashboard.html','utf8');assert(!html.includes('active-dashboard-link'));
  for(const active of ['student','teacher','admin'])if(page!==active)await check(page,active);
 }
 console.log('PASS: all six role mismatches block dashboard loading and cross-role continuation; logout enables the selected role login.');
})().catch(error=>{console.error(error);process.exitCode=1;});
