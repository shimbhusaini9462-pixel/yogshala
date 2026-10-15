'use strict';
// Open local previews through the PHP server so account APIs can run.
(() => {
    const location=window.location;
    const livePreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname) && /^55\d{2}$/.test(location.port);
    if(location.protocol==='file:' || livePreview) {
        window.__yogshalaRedirecting=true;
        const page=location.pathname.split('/').pop() || 'index.html';
        location.replace('http://127.0.0.1:8085/'+page+location.search+location.hash);
    }
})();
﻿document.addEventListener('DOMContentLoaded', () => {
    if(window.__yogshalaRedirecting) return;
    document.addEventListener('click', event => {
        const toggle = event.target.closest('[data-password-toggle]');
        if (!toggle) return;
        const input = document.getElementById(toggle.dataset.passwordToggle);
        if (!input) return;
        const visible = input.type === 'password';
        input.type = visible ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', String(visible));
        toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
        toggle.title = visible ? 'Hide password' : 'Show password';
        toggle.querySelector('.password-slash').style.display = visible ? '' : 'none';
    });
    const panel = document.getElementById('account-panel');
    const login = document.getElementById('account-login');
    const signup = document.getElementById('account-signup');
    const dashboard = document.getElementById('account-dashboard');
    const content = document.getElementById('dashboard-content');
    const message = document.getElementById('panel-message');
    const query = new URLSearchParams(window.location.search);
    const pageRole=document.body.dataset.dashboardRole;
    let role=pageRole || 'student', session=null, dashboardData=null;
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    async function api(path, data) {
        let response;
        try { response = await fetch('api/' + path, data ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...data, ...(session ? {token:session.token} : {})})} : {}); }
        catch { throw new Error('Cannot connect to the website server.'); }
        let result;
        try { result = await response.json(); } catch { throw new Error('Open the website at http://127.0.0.1:8085 to use your account.'); }
        if (!response.ok || !result.success) throw new Error(result.message || 'Request failed.');
        return result;
    }
    function notify(text) { message.textContent = text; message.hidden=!text; }
    function meetingUrl(value) {
        const url=new URL(value);
        if(url.protocol!=='https:') throw new Error('Video link unavailable. Refresh your dashboard and try again.');
        return url.href;
    }
    async function showVideoReady(url, room, title, classId) {
        content.querySelectorAll('.waiting-video video').forEach(video=>video.pause());
        if(room)room.close();
        await window.YogshalaVideo.open({url:meetingUrl(url),title,displayName:session.user.name,role,classId,token:session.token});
        notify('Video room opened inside your dashboard. Use Retry Connection if needed.');
    }
    const indiaDate = new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit' });
    function classStart(item) { return new Date(item.class_date+'T'+item.class_time+'+05:30'); }
    function classWhen(item) { return indiaDate.format(classStart(item))+' IST'; }
    function nextSession(data) {
        const classes=data.classes.filter(item=>item.status==='live' || (item.status==='upcoming' && (role==='teacher' || classStart(item).getTime()+Number(item.duration)*60000>Date.now())));
        classes.sort((a,b)=>(a.status==='live' ? 0 : 1)-(b.status==='live' ? 0 : 1) || classStart(a)-classStart(b));
        const next=classes[0];
        if(!next) return '<section class="session-spotlight"><span class="session-status">Your practice space</span><h3>No sessions scheduled yet</h3><p>Your assigned sessions will appear here. Contact Yogshala to confirm your batch and timings.</p><a class="btn btn-gold" href="https://wa.me/917689941298">Contact Yogshala</a></section>';
        let action='';
        if(role==='student') action=next.status==='live' && data.membership==='active' ? '<button class="btn btn-success" data-join="'+Number(next.live_class_id)+'">Join Live Class</button>' : data.membership!=='active' ? '<a class="btn btn-gold" href="index.html#join-form">Confirm / Renew Membership</a>' : '<p>Waiting for your teacher to start. This page checks automatically; Join will appear when the class goes live.</p>';
        if(role==='teacher') action=next.status==='live' ? '<button class="btn btn-success" data-class-id="'+Number(next.live_class_id)+'" data-room-url="'+escape(next.room_url)+'">Open Video Class</button>' : '<button class="btn btn-success" data-class="'+Number(next.live_class_id)+'" data-endpoint="startClass.php">Start Class</button><p class="mt-2">You can start this assigned class whenever you are ready.</p>';
        if(role==='student' && next.status!=='live' && data.waiting_video) action+='<div class="waiting-video"><p>While you wait, enjoy this video. Live class access appears when your teacher starts.</p><video autoplay muted loop playsinline controls preload="metadata" src="'+escape(data.waiting_video)+'" aria-label="Yogshala waiting video"></video><p class="video-help">Video starts muted. Use the speaker control for sound.</p></div>';
        return '<section class="session-spotlight"><span class="session-status">'+(next.status==='live' ? 'LIVE NOW' : 'NEXT SESSION')+'</span><h3>'+escape(next.batch_name)+'</h3><p>'+escape(classWhen(next))+' · '+Number(next.duration)+' minutes</p>'+action+'</section>';
    }
    function showLogin() {
        window.YogshalaVideo?.close();
        document.body.classList.add('is-login');
        document.getElementById('password-recovery').hidden=true;
        login.hidden=false; signup.hidden=true; dashboard.hidden=true;
        document.getElementById('show-signup').hidden=pageRole!=='student';
        document.getElementById('panel-title').textContent=role[0].toUpperCase()+role.slice(1)+' Login';
        document.getElementById('account-email-label').textContent=role==='admin' ? 'Admin username' : 'Email';
        document.getElementById('account-email').type=role==='admin' ? 'text' : 'email';
        document.querySelectorAll('[data-password-toggle]').forEach(toggle=>{
            const input=document.getElementById(toggle.dataset.passwordToggle);if(input)input.type='password';
            toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Show password');toggle.title='Show password';toggle.querySelector('.password-slash').style.display='none';
        });
    }
    async function run(button, task) { if(button) button.disabled=true; try { await task(); } catch(error) { notify(error.message); } finally { if(button) button.disabled=false; } }
    function displayValue(key,value) {
        if(key!=='details') return escape(value ?? '—');
        try {const fields=JSON.parse(value);if(!fields || typeof fields!=='object' || Array.isArray(fields))return escape(value);return '<details class="enquiry-details"><summary>View enquiry</summary><dl>'+Object.entries(fields).map(([label,text])=>'<dt>'+escape(label)+'</dt><dd>'+(label==='paymentProof' ? '<a target="_blank" rel="noopener noreferrer" href="api/paymentProof.php?file='+encodeURIComponent(String(text))+'">View payment screenshot</a>' : escape(text))+'</dd>').join('')+'</dl></details>';}
        catch {return escape(value);}
    }
    const table = (rows, keys) => rows.length ? '<div class="table-responsive"><table class="table"><thead><tr>'+keys.map(k=>'<th scope="col">'+escape(k.replaceAll('_',' '))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+keys.map(k=>'<td data-label="'+escape(k.replaceAll('_',' '))+'">'+displayValue(k,row[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>' : '<p class="panel-empty">No records yet.</p>';
    const options = rows => '<option value="">Choose...</option>'+rows.map(row=>'<option value="'+Number(row.id)+'">'+escape(row.name)+'</option>').join('');
    let fieldSequence=0;
    function field(label,name,type='text',attrs='') {
        const id='panel-field-'+(++fieldSequence);
        const input='<input id="'+id+'" class="form-control" name="'+name+'" type="'+type+'" required '+attrs+'>';
        const eye='<button type="button" class="password-toggle" data-password-toggle="'+id+'" aria-controls="'+id+'" aria-label="Show password" aria-pressed="false" title="Show password"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="password-slash" d="m3 3 18 18" style="display:none"/></svg></button>';
        return '<label class="d-block mb-2" for="'+id+'">'+label+'</label>'+(type==='password' ? '<div class="password-field mb-2">'+input+eye+'</div>' : input);
    }
    function select(label,name,rows) { return '<label class="d-block mb-2">'+label+'<select name="'+name+'" class="form-select" required>'+options(rows)+'</select></label>'; }
    function form(action,title,fields) {return '<div class="col-md-6 col-lg-4"><details class="panel-form-card border rounded p-3"><summary>'+title+'</summary><form data-action="'+action+'" class="mt-3">'+fields+'<button class="btn btn-success">Save</button></form></details></div>';}
    async function load() {
        const current=await api('portal.php?action=session');
        if(current.user.role!==pageRole) {
            session=current;
            role=pageRole;dashboardData=null;content.replaceChildren();
            showLogin();
            login.hidden=true;signup.hidden=true;
            document.getElementById('account-switch').hidden=false;
            document.getElementById('active-account-message').textContent='A '+current.user.role+' account is already signed in. This page only accepts '+pageRole+' accounts. Log out, then sign in with the correct account.';
            return;
        }
        document.getElementById('account-switch').hidden=true;
        session=current;role=current.user.role;
        const data=await api('portal.php?action=dashboard&view='+encodeURIComponent(pageRole));
        document.body.classList.remove('is-login');
        dashboardData=data;
        panel.hidden=false;login.hidden=true;signup.hidden=true;dashboard.hidden=false;
        document.getElementById('panel-title').textContent=session.user.name+' — '+role+' panel';
        let html='';
        if(role!=='admin') html+=nextSession(data)+'<details class="portal-preparation"><summary>Before you join your class</summary><ul><li>Keep your yoga mat and teacher-recommended props ready.</li><li>Choose a quiet space with enough room to move.</li><li>Check your internet, camera and microphone permissions.</li><li>Join from your dashboard once the teacher opens the session.</li></ul></details>';
        if(role!=='admin') html+='<details class="panel-edit-tools mb-4"><summary>My profile</summary><form data-action="profile" class="mt-3"><label class="d-block mb-2">Name<input name="name" class="form-control" maxlength="100" required value="'+escape(data.profile.name)+'"></label><label class="d-block mb-2">Email<input name="email" type="email" class="form-control" maxlength="100" required value="'+escape(data.profile.email)+'"></label><button class="btn btn-success">Save profile</button></form></details>';
        if(role==='student') html+='<section class="portal-membership" aria-label="Membership overview"><div><span>Membership</span><strong>'+escape(data.membership)+'</strong></div><div><span>Valid until</span><strong>'+escape(data.expiry || 'Payment confirmation pending')+'</strong></div><div><span>Assigned batches</span><strong>'+data.batches.length+'</strong></div></section><h3>Payments</h3>'+table(data.payments,['amount','payment_date','expiry_date']);
        if(role==='admin') {
            html+='<div class="panel-stats mb-4"><div><strong>'+data.students.length+'</strong><span>Students</span></div><div><strong>'+data.teachers.length+'</strong><span>Teachers</span></div><div><strong>'+data.batches.length+'</strong><span>Batches</span></div><div><strong>'+data.students.filter(item=>item.subscription_status==='active').length+'</strong><span>Active memberships</span></div></div><nav class="panel-shortcuts mb-3" aria-label="Admin sections"><a href="#admin-controls">Manage</a><a href="#admin-teachers">Teachers</a><a href="#admin-students">Students</a><a href="#admin-batches">Batches</a><a href="#admin-payments">Payments</a><a href="#admin-enquiries">Enquiries</a></nav><label class="d-block mb-3">Search records<input id="records-search" type="search" class="form-control" placeholder="Search name, email, batch or payment..."></label>';

            html+='<div id="admin-controls" class="row g-3 mb-4">'+form('teacher','Add teacher',field('Name','name')+field('Email','email','email')+field('Password','password','password','minlength="8"'))+form('student','Add student',field('Name','name')+field('Email','email','email')+field('Password','password','password','minlength="8"'))+form('batch','Create batch',field('Batch name','name')+select('Teacher','teacher_id',data.teachers))+form('enroll','Assign student',select('Student','student_id',data.students)+select('Batch','batch_id',data.batches))+form('schedule','Schedule class',select('Batch','batch_id',data.batches)+field('Date (India time)','date','date')+field('Time (India time)','time','time')+field('Duration (minutes)','duration','number','min="10" max="240"'))+form('payment','Record received payment',select('Student','student_id',data.students)+field('Amount','amount','number','min="0.01" step="0.01"')+field('Membership expiry','expiry','date'))+'</div>';
            html+='<div class="row g-3 mb-4">'+form('waiting_video','Student waiting video','<label for="waiting-video-url">Direct HTTPS MP4/WebM URL</label><input id="waiting-video-url" name="url" type="url" class="form-control mb-2" maxlength="2000" value="'+escape(data.waiting_video || '')+'"><p>Loops before the teacher starts. Leave empty to remove. Use a direct video link, not a YouTube page.</p>')+'</div>';
            html+='<div class="row g-3 mb-4">'+form('admin_recovery_email','My admin recovery email',field('Recovery email','email','email','maxlength="100"')+field('Current admin password','current_password','password','autocomplete="current-password"'))+'</div>';
            html+='<div class="row g-3 mb-4">'+form('reset_teacher_password','Reset teacher password',select('Teacher','teacher_id',data.teachers)+field('New password','password','password','minlength="8" maxlength="72" autocomplete="new-password"')+'<label class="d-block my-3"><input type="checkbox" name="verified" value="yes" required> I verified this teacher?s identity</label>')+'</div>';
            html+='<details class="panel-edit-tools mb-4"><summary>Edit accounts, batches and memberships</summary><div class="row g-3 mt-2">'+form('update_teacher','Edit teacher',select('Teacher','id',data.teachers)+field('Name','name')+field('Email','email','email'))+form('update_student','Edit student',select('Student','id',data.students)+field('Name','name')+field('Email','email','email'))+form('update_batch','Edit batch',select('Batch','id',data.batches)+field('Batch name','name')+select('Teacher','teacher_id',data.teachers))+form('membership','Membership control',select('Student','student_id',data.students)+'<label class="d-block mb-2">Status<select name="status" class="form-select" required><option value="expired">Pause / Expired</option><option value="active">Active (current payment required)</option></select></label>')+form('unassign','Remove batch assignment',select('Student','student_id',data.students)+select('Batch','batch_id',data.batches))+'</div></details>';
            html+='<h3 id="admin-teachers">Teachers</h3>'+table(data.teachers,['id','name','email'])+'<h3 id="admin-students">Students</h3>'+table(data.students,['id','name','email','subscription_status','expiry'])+'<h3 id="admin-batches">Batches</h3>'+table(data.batches,['id','name','teacher'])+'<h3>Batch assignments</h3>'+table(data.enrollments,['student_name','batch_name'])+'<h3 id="admin-payments">Payment history</h3>'+table(data.payments,['student_name','email','amount','payment_date','expiry_date'])+'<h3 id="admin-enquiries">Enquiries</h3>'+table(data.enquiries,['name','phone','email','details','created_at']);
        }
        if(role==='teacher') html+='<h3>My students</h3>'+table(data.students,['name','email','batch_name']);
        if(role==='student') html+='<h3>My batches</h3>'+table(data.batches,['name','teacher_name'])+'<h3>My attendance</h3>'+table(data.attendance,['batch_name','class_date','join_time','leave_time','duration']);
        html+='<h3 id="panel-classes">Classes and recent history</h3><label class="class-filter mb-3">Show classes<select id="class-filter" class="form-select"><option value="all">All</option><option value="live">Live now</option><option value="upcoming">Upcoming</option><option value="ended">Ended</option><option value="cancelled">Cancelled</option></select></label>';
        if(!data.classes.length) html+='<p>No classes assigned yet.</p>';
        for(const item of data.classes) {
            html+='<div class="class-panel-card border rounded p-3 mb-3" data-class-status="'+escape(item.status)+'"><h4>'+escape(item.batch_name)+'</h4><p>'+escape(item.class_date)+' '+escape(item.class_time)+' IST · '+escape(item.duration)+' minutes · '+escape(item.status)+'</p>';
            if(role==='student' && item.status==='live') html+=data.membership==='active' ? '<button class="btn btn-success" data-join="'+Number(item.live_class_id)+'">Join class</button>' : '<p>Membership renewal required to join.</p><a href="index.html#join-form">Renew membership</a>';
            if(role==='teacher') {
                if(item.status==='upcoming') html+='<button class="btn btn-success" data-class="'+Number(item.live_class_id)+'" data-endpoint="startClass.php">Start class</button> ';
                if(item.status==='live') html+='<button class="btn btn-success" data-class-id="'+Number(item.live_class_id)+'" data-room-url="'+escape(item.room_url)+'">Open Video Class</button> <button class="btn btn-outline-danger" data-class="'+Number(item.live_class_id)+'" data-endpoint="endClass.php">End class</button> ';
                html+='<button class="btn btn-outline-secondary" data-attendance="'+Number(item.live_class_id)+'">Attendance</button>';
            }
            if((role==='admin' || role==='teacher') && item.status==='upcoming') html+='<details class="mt-3"><summary>Change class schedule</summary><form data-action="reschedule" class="mt-3"><input type="hidden" name="live_class_id" value="'+Number(item.live_class_id)+'">'+field('Date (India time)','date','date','value="'+escape(item.class_date)+'"')+field('Time (India time)','time','time','value="'+escape(item.class_time.slice(0,5))+'"')+field('Duration (minutes)','duration','number','min="10" max="240" value="'+Number(item.duration)+'"')+'<button class="btn btn-success">Save schedule</button></form></details><button type="button" class="btn btn-outline-danger mt-3" data-cancel="'+Number(item.live_class_id)+'">Cancel class</button>';
            html+='</div>';
        }
        if(role==='teacher') html+='<h3>Teaching notes</h3><form id="notes-upload"><label>Upload PDF, JPG, PNG or TXT (max 2 MB)<input type="file" name="note" class="form-control" accept=".pdf,.jpg,.jpeg,.png,.txt" required></label><button class="btn btn-success mt-2">Upload</button></form><div id="notes-list"></div>';
        html+='<div id="attendance-list"></div>';content.innerHTML=html;
        if(role==='teacher') {
            const notes=await api('teacherNotes.php');
            document.getElementById('notes-list').innerHTML=notes.files.map(file=>'<p><a href="api/teacherNotes.php?file='+encodeURIComponent(file.file)+'">Download note</a> · '+escape(file.date)+'</p>').join('');
            document.getElementById('notes-upload').addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{const body=new FormData(event.target);body.set('token',notes.token);const response=await fetch('api/teacherNotes.php',{method:'POST',body});const result=await response.json();if(!result.success)throw new Error(result.message);await load();notify(result.message);});});
        }
    }
    document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();panel.hidden=false;role=button.dataset.role;notify('');if(session)run(button,load);else showLogin();panel.scrollIntoView({behavior:'smooth'});}));
    document.getElementById('show-signup').addEventListener('click',()=>{login.hidden=true;signup.hidden=false;document.getElementById('panel-title').textContent='Student registration';});
    document.getElementById('back-login').addEventListener('click',showLogin);
    login.addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{await api('login.php',{...Object.fromEntries(new FormData(login)),role});login.reset();await load();notify('Logged in successfully.');});});
    signup.addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{
        const details=Object.fromEntries(new FormData(signup));
        details.name=details.name.trim();details.email=details.email.trim();
        await api('signup.php',{...details,role:'student'});
        signup.reset();login.reset();role='student';showLogin();
        document.getElementById('account-email').value=details.email;
        document.getElementById('account-password').focus();
        notify('Account created. Log in now; membership is activated after payment confirmation.');
    });});
    document.getElementById('refresh-panel').addEventListener('click',event=>run(event.target,load));
    document.getElementById('account-logout').addEventListener('click',event=>run(event.target,async()=>{await api('logout.php',{});session=null;content.replaceChildren();showLogin();notify('Logged out.');}));
    document.getElementById('switch-account').addEventListener('click',event=>run(event.target,async()=>{
        await api('logout.php',{});
        session=null;role=pageRole;login.reset();signup.reset();content.replaceChildren();
        document.getElementById('account-switch').hidden=true;
        showLogin();notify('Logged out. You can now log in as '+pageRole+'.');
        document.getElementById('account-email').focus();
    }));
    content.addEventListener('input', event => {
        if(event.target.id!=='records-search') return;
        const query=event.target.value.trim().toLowerCase();
        content.querySelectorAll('table tbody tr').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(query);});
    });
    content.addEventListener('change', event => {
        if(event.target.id==='class-filter') {content.querySelectorAll('[data-class-status]').forEach(card=>{card.hidden=event.target.value!=='all' && card.dataset.classStatus!==event.target.value;});return;}
        const edit=event.target.closest('form[data-action^="update_"]');
        if(!edit || event.target.name!=='id' || !dashboardData) return;
        const group={update_teacher:'teachers',update_student:'students',update_batch:'batches'}[edit.dataset.action];
        const item=dashboardData[group].find(row=>String(row.id)===event.target.value);
        for(const key of ['name','email','teacher_id']) {const input=edit.elements.namedItem(key);if(input)input.value=item?.[key] ?? '';}
    });
    content.addEventListener('submit',event=>{const action=event.target.dataset.action;if(!action)return;event.preventDefault();if(action==='unassign' && !window.confirm('Remove this student from the selected batch? You can assign them again later.'))return;run(event.submitter,async()=>{await api('portal.php?action='+action,{...Object.fromEntries(new FormData(event.target)),token:session.token});await load();notify('Saved successfully.');});});
    content.addEventListener('click',event=>{const button=event.target.closest('button');if(!button || !(button.dataset.join || button.dataset.class || button.dataset.attendance || button.dataset.cancel || button.dataset.roomUrl))return;run(button,async()=>{
        if(button.dataset.join){
            const room=null;
            try {const data=await api('joinClass.php',{live_class_id:Number(button.dataset.join)});await showVideoReady(data.room_url,room,'Join your live class',button.dataset.join);}
            catch(error){if(room)room.close();throw error;}
        }
        if(button.dataset.roomUrl){
            const url=meetingUrl(button.dataset.roomUrl);
            await showVideoReady(url,null,'Your teaching room',button.dataset.classId);
        }
        if(button.dataset.cancel && window.confirm('Cancel this upcoming class?')) {await api('portal.php?action=cancel_class',{live_class_id:Number(button.dataset.cancel)});await load();notify('Class cancelled.');}
        if(button.dataset.class){
            const starting=button.dataset.endpoint==='startClass.php';
            const room=null;
            try {
                const result=await api(button.dataset.endpoint,{live_class_id:Number(button.dataset.class)});
                await load();
                if(starting)await showVideoReady(result.room_url,room,'Your class is live',button.dataset.class);else {window.YogshalaVideo.closeIfClass(button.dataset.class);notify('Class ended.');}
            }catch(error){if(room)room.close();throw error;}
        }
        if(button.dataset.attendance){const data=await api('attendance.php?live_class_id='+button.dataset.attendance);document.getElementById('attendance-list').innerHTML='<h3>Attendance</h3>'+table(data.attendance,['student_name','student_email','join_time','leave_time','duration']);}
    });});
    if(pageRole) {
        panel.hidden=false;showLogin();
        if(query.has('signup') && pageRole==='student') {login.hidden=true;signup.hidden=false;document.getElementById('panel-title').textContent='Student registration';}
        panel.scrollIntoView();
    }
    const recovery=document.getElementById('password-recovery');
    let resetToken=query.get('reset_token');
    function openRecovery() {login.hidden=true;signup.hidden=true;dashboard.hidden=true;recovery.hidden=false;notify('');}
    document.getElementById('forgot-password').addEventListener('click',openRecovery);
    document.getElementById('recovery-back').addEventListener('click',()=>{
        resetToken=null;
        if(pageRole!=='teacher') {
            document.getElementById('request-password-reset').hidden=false;
            document.getElementById('confirm-password-reset').hidden=true;
        }
        showLogin();
    });
    if(pageRole!=='teacher') {
        const request=document.getElementById('request-password-reset');
        const confirm=document.getElementById('confirm-password-reset');
        request.addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{
            const result=await api('passwordRecovery.php',{action:'request',role:pageRole,account:request.elements.account.value.trim()});notify(result.message);
        });});
        confirm.addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{
            const password=document.getElementById('reset-password').value;
            if(password!==document.getElementById('reset-confirm').value)throw Error('Passwords do not match.');
            const result=await api('passwordRecovery.php',{action:'reset',reset_token:resetToken,password});
            resetToken=null;session=null;confirm.reset();request.hidden=false;confirm.hidden=true;login.reset();showLogin();notify(result.message);
        });});
        if(resetToken){
            history.replaceState(null,'',location.pathname);
            openRecovery();request.hidden=true;confirm.hidden=false;
            document.getElementById('recovery-help').textContent='Choose a new password of 8?72 characters. This link can be used once.';
        }
    }
    let waitingRefresh=false;
    setInterval(async()=>{
        if(role!=='student' || !session || document.hidden || dashboard.hidden || document.getElementById('embedded-video') || waitingRefresh)return;
        waitingRefresh=true;
        try {
            const data=await api('portal.php?action=dashboard&view=student');
            const spotlight=content.querySelector('.session-spotlight');
            const rendered=nextSession(data);
            if(spotlight && spotlight.outerHTML!==rendered){
                const replacement=document.createElement('div');replacement.innerHTML=rendered;
                // Preserve playback when the same waiting state remains unchanged.
                const oldVideo=spotlight.querySelector('video'),newVideo=replacement.querySelector('video');
                const sameVideo=oldVideo && newVideo && oldVideo.getAttribute('src')===newVideo.getAttribute('src') && spotlight.querySelector('h3')?.textContent===replacement.querySelector('h3')?.textContent;
                if(!sameVideo){oldVideo?.pause();spotlight.replaceWith(replacement.firstElementChild);}
            }
        }catch(error){notify(error.message);}finally{waitingRefresh=false;}
    },10000);
    if(!resetToken)api('portal.php?action=session').then(()=>load()).catch(()=>{});
});
