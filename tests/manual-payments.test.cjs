'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {execFileSync,spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),php='C:/xampp/php/php.exe',db='yogshala_manual_test_'+Date.now();
const env={...process.env,DATABASE_URL:'',DB_DRIVER:'mysql',DB_HOST:'127.0.0.1',DB_PORT:'3306',DB_NAME:db,DB_USER:'root',DB_PASSWORD:''};
const run=code=>execFileSync(php,['-r',"$pdo=new PDO('mysql:host=127.0.0.1;port=3306','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);"+code],{cwd:root,env,encoding:'utf8'});
const sql=code=>run("$pdo->exec('USE "+db+"');"+code);
let server,created=false;const proofs=[];
(async()=>{
 assert.match(db,/^yogshala_manual_test_\d+$/);run("$pdo->exec('CREATE DATABASE "+db+"');");created=true;
 run("$pdo->exec(str_replace('yogshala_local','"+db+"',file_get_contents('database/database.sql')));$pdo->exec(file_get_contents('database/manual-payments-mysql.sql'));$hash=password_hash('Test-password-123',PASSWORD_DEFAULT);$pdo->prepare('INSERT INTO admins(username,password) VALUES(?,?)')->execute(['admin',$hash]);foreach(['one','two'] as $n)$pdo->prepare('INSERT INTO students(name,email,password) VALUES(?,?,?)')->execute([$n,$n.'@test.example',$hash]);");
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 server=spawn(php,['-S','127.0.0.1:'+port,'router.php'],{cwd:root,env,windowsHide:true,stdio:'ignore'});const base='http://127.0.0.1:'+port+'/api/';
 for(let i=0;i<40;i++){try{await fetch(base+'manual-payments.php');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 function client(){let cookie='',token='';return {async req(endpoint,data,status=200){const form=data instanceof FormData;if(form)data.set('token',token);const res=await fetch(base+endpoint,{headers:{Cookie:cookie,...(data&&!form?{'Content-Type':'application/json'}:{})},...(data?{method:'POST',body:form?data:JSON.stringify({token,...data})}:{})});const set=res.headers.get('set-cookie');if(set)cookie=set.split(';')[0];assert.equal(res.status,status,endpoint+' '+await res.clone().text());const body=await res.json();if(body.token)token=body.token;return body;},async proof(file){return fetch(base+'paymentProof.php?file='+file,{headers:{Cookie:cookie}});}};}
 const guest=client(),admin=client(),one=client(),two=client();await guest.req('manual-payments.php',null,401);
 for(const [c,email,role]of [[admin,'admin','admin'],[one,'one@test.example','student'],[two,'two@test.example','student']]){assert.equal((await c.req('login.php',{email,role,password:'Test-password-123'})).success,true);await c.req('portal.php?action=session');}
 await one.req('manual-payments.php?action=review',{id:1,decision:'approved',checked:'yes'},403);await one.req('manual-payments.php?action=submit',{token:'bad'},403);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 function upload(txn,bytes=png){const f=new FormData();f.set('plan','0');f.set('transaction_id',txn);f.set('amount','1');f.set('proof',new Blob([bytes],{type:'image/png'}),'proof.png');return f;}
 await one.req('manual-payments.php?action=submit',upload('TEST00000001',Buffer.from('<?php echo 1;')),400);await one.req('manual-payments.php?action=submit',upload('TEST00000001'));
 let rows=(await admin.req('manual-payments.php')).requests;const first=rows[0];proofs.push(first.proof_file);assert.equal(first.status,'pending');assert.equal(Number(first.amount),149900);
 assert.equal(sql("echo $pdo->query('SELECT COUNT(*) FROM payments')->fetchColumn();"),'0');assert.equal((await two.req('manual-payments.php')).requests.length,0);
 assert.equal((await one.proof(first.proof_file)).status,403);assert.equal((await admin.proof(first.proof_file)).status,200);
 await one.req('manual-payments.php?action=submit',upload('TEST00000002'),409);await admin.req('manual-payments.php?action=review',{id:Number(first.id),decision:'approved'},400);
 await admin.req('manual-payments.php?action=review',{id:Number(first.id),decision:'approved',checked:'yes'});await admin.req('manual-payments.php?action=review',{id:Number(first.id),decision:'approved',checked:'yes'},409);
 assert.equal(sql("echo $pdo->query('SELECT COUNT(*) FROM payments')->fetchColumn();"),'1');assert.equal(sql("echo $pdo->query('SELECT subscription_status FROM students WHERE id=1')->fetchColumn();"),'active');
 await two.req('manual-payments.php?action=submit',upload('TEST00000001'),409);await two.req('manual-payments.php?action=submit',upload('TEST00000003'));
 rows=(await admin.req('manual-payments.php')).requests;const second=rows.find(r=>r.transaction_id==='TEST00000003');proofs.push(second.proof_file);
 await admin.req('manual-payments.php?action=review',{id:Number(second.id),decision:'rejected'},400);await admin.req('manual-payments.php?action=review',{id:Number(second.id),decision:'rejected',note:'UTR not present in statement.'});
 assert.equal(sql("echo $pdo->query('SELECT subscription_status FROM students WHERE id=2')->fetchColumn();"),'expired');assert.equal(sql("echo $pdo->query('SELECT COUNT(*) FROM payments')->fetchColumn();"),'1');
 console.log('PASS manual UPI: authentication, CSRF, image validation, server prices, private proofs, pending limit, duplicate UTR, verified approval, repeat approval, rejection and student isolation.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server){const exited=new Promise(r=>server.once('exit',r));server.kill();await exited;}for(const file of proofs)if(/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(file))fs.rmSync(path.join(root,'uploads/payment-proofs',file),{force:true});if(created)run("$pdo->exec('DROP DATABASE "+db+"');");});
