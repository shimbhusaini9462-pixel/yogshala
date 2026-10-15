const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const base='http://127.0.0.1:8085/api/';
const tag='recovery-test-'+Date.now();
const php=process.env.PHP_BINARY || 'C:/xampp/php/php.exe';
function sql(code){return execFileSync(php,['-r',"require 'config.php'; "+code],{encoding:'utf8'});}
function client(){let cookie='',token='';return async(path,data)=>{const r=await fetch(base+path,{headers:{...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{method:'POST',body:JSON.stringify({...data,token})}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const value=await r.json();if(value.token)token=value.token;return {status:r.status,...value};};}
function resetToken(role,id,expired=false){const token=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(token).digest('hex');const table=role==='student'?'students':'admins';sql(`$q=$pdo->query('SELECT password FROM ${table} WHERE id=${Number(id)}');$stamp=hash('sha256',$q->fetchColumn());$pdo->prepare('INSERT INTO password_resets(role,user_id,token_hash,password_stamp,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(),INTERVAL ${expired?'-1':'30'} MINUTE))')->execute(['${role}',${Number(id)},'${hash}',$stamp]);`);return token;}
(async()=>{
 const admin=client(),student=client(),teacher=client(),guest=client();
 const password=fs.readFileSync('database/local-admin.txt','utf8').match(/Password: (.+)/)[1].trim();
 assert((await admin('login.php',{role:'admin',email:'admin',password})).success);
 await admin('portal.php?action=session');
 assert((await student('signup.php',{role:'student',email:tag+'@example.com',name:tag,password:'Initial-test-123'})).success);
 await student('login.php',{role:'student',email:tag+'@example.com',password:'Initial-test-123'});await student('portal.php?action=session');
 await admin('portal.php?action=teacher',{name:tag,email:tag+'-teacher@example.com',password:'Initial-test-123'});
 const data=await admin('portal.php?action=dashboard');
 const sid=data.students.find(x=>x.name===tag).id,tid=data.teachers.find(x=>x.name===tag).id;
 assert.equal((await guest('passwordRecovery.php',{role:'teacher',account:tag+'-teacher@example.com'})).status,400);
 assert.equal((await student('portal.php?action=reset_teacher_password',{teacher_id:tid,password:'Changed-test-123',verified:'yes'})).success,false);
 await teacher('login.php',{role:'teacher',email:tag+'-teacher@example.com',password:'Initial-test-123'});await teacher('portal.php?action=session');
 assert.equal((await admin('portal.php?action=reset_teacher_password',{teacher_id:tid,password:'Changed-test-123'})).success,false);
 assert((await admin('portal.php?action=reset_teacher_password',{teacher_id:tid,password:'Changed-test-123',verified:'yes'})).success);
 assert.equal((await teacher('portal.php?action=session')).status,401);
 assert((await teacher('login.php',{role:'teacher',email:tag+'-teacher@example.com',password:'Changed-test-123'})).success);
 const expired=resetToken('student',sid,true);
 assert.equal((await guest('passwordRecovery.php',{action:'reset',reset_token:expired,password:'Changed-test-123'})).success,false);
 const token=resetToken('student',sid);
 assert((await guest('passwordRecovery.php',{action:'reset',reset_token:token,password:'Changed-test-123'})).success);
 assert.equal((await student('portal.php?action=session')).status,401);
 assert.equal((await guest('passwordRecovery.php',{action:'reset',reset_token:token,password:'Changed-test-456'})).success,false);
 assert((await student('login.php',{role:'student',email:tag+'@example.com',password:'Changed-test-123'})).success);
 const aid=Number(sql(`$pdo->prepare('INSERT INTO admins(username,password) VALUES(?,?)')->execute(['${tag}',password_hash('Initial-test-123',PASSWORD_DEFAULT)]);echo $pdo->lastInsertId();`));
 const adminToken=resetToken('admin',aid);
 assert((await guest('passwordRecovery.php',{action:'reset',reset_token:adminToken,password:'Changed-test-123'})).success);
 assert((await guest('login.php',{role:'admin',email:tag,password:'Changed-test-123'})).success);
 console.log('PASS: student/admin self-reset, teacher admin-only reset, expired/reused tokens rejected, old sessions invalidated. Email delivery was not attempted.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
 sql(`foreach(['student'=>'students','admin'=>'admins'] as $role=>$table){$col=$role==='admin'?'username':'name';$q=$pdo->prepare('SELECT id FROM '.$table.' WHERE '.$col.'=?');$q->execute(['${tag}']);foreach($q->fetchAll() as $row)$pdo->prepare('DELETE FROM password_resets WHERE role=? AND user_id=?')->execute([$role,$row['id']]);}foreach(['students','teachers'] as $table)$pdo->prepare('DELETE FROM '.$table.' WHERE name=?')->execute(['${tag}']);$pdo->prepare('DELETE FROM admins WHERE username=?')->execute(['${tag}']);`);
});
