'use strict';
(() => {
    const livePreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname) && /^55\d{2}$/.test(location.port);
    if(location.protocol==='file:' || livePreview) location.replace('http://127.0.0.1:8085/online-classes.html'+location.search+location.hash);
})();
document.addEventListener('DOMContentLoaded', () => {
    const query=new URLSearchParams(location.search);
    if (query.has('role') || query.has('signup') || location.hash==='#account-panel') {
        const role=['admin','teacher','student'].includes(query.get('role')) ? query.get('role') : 'student';
        location.replace(role+'-dashboard.html'+(query.has('signup') && role==='student' ? '?signup=1' : ''));
        return;
    }
    const button=document.getElementById('refresh-schedule');
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    async function refresh() {
        button.disabled=true;
        try {
            const response=await fetch('api/publicSchedule.php');
            const data=await response.json();
            if(!response.ok || !data.success) throw Error(data.message || 'Schedule unavailable.');
            const date=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
            document.getElementById('public-schedule').innerHTML=data.classes.length ? data.classes.map(item=>'<tr><td>'+escape(item.class_name)+'</td><td>'+escape(item.instructor || 'To be assigned')+'</td><td>'+date.format(new Date(item.class_date+'T'+item.class_time+'+05:30'))+' IST</td><td>'+Number(item.duration)+' minutes</td></tr>').join('') : '<tr><td colspan="4">No upcoming classes scheduled. Contact us to choose a batch.</td></tr>';
            document.getElementById('schedule-updated').textContent='Schedule updated · timings in IST · refreshes every minute';
        } catch(error) { document.getElementById('schedule-updated').textContent='Schedule unavailable. Please try again.'; }
        finally {button.disabled=false;}
    }
    button.addEventListener('click',refresh);
    refresh();
    setInterval(()=>{if(!document.hidden && !button.disabled)refresh();},60000);
});
