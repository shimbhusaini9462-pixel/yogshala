'use strict';
window.renderManualPayments=async function(root,session,role,api,reload,notify) {
    if(!['student','admin'].includes(role)) return;
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const section=document.createElement('section');section.className='manual-payment-section my-4';section.id='manual-payments';root.append(section);
    const title=role==='student'?'Pay by UPI / Renew membership':'UPI payments awaiting review';
    section.innerHTML='<h3>'+title+'</h3><p role="status">Loading payment details...</p>';
    try {
        const data=await api('manual-payments.php');
        const pending=data.requests.some(row=>row.status==='pending');
        let html='<h3>'+title+'</h3>';
        if(role==='student') {
            html+='<p>Scan the QR using your UPI app. Check the receiver in your app before paying. Submit your transaction reference and screenshot below. Membership activates only after Yogshala verifies the bank transaction.</p>';
            if(pending) html+='<p class="alert alert-info">Your payment is awaiting review. Please do not pay or submit again.</p>';
            else html+='<div class="manual-payment-layout"><div><img class="manual-payment-qr" src="'+escape(data.qr)+'" alt="Yogshala UPI payment QR code" width="240" height="220"><p><a href="'+escape(data.qr)+'" download>Download payment QR</a></p></div><form id="manual-payment-form" enctype="multipart/form-data"><label>Online membership plan<select name="plan" class="form-select" required>'+data.plans.map(p=>'<option value="'+p.id+'">'+escape(p.name)+' - INR '+(p.amount/100).toLocaleString('en-IN')+'</option>').join('')+'</select></label><label>UPI transaction reference / UTR<input class="form-control" name="transaction_id" required pattern="[A-Za-z0-9]{10,40}" minlength="10" maxlength="40" autocomplete="off"></label><label>Payment screenshot (JPG, PNG or WebP, max 2 MB)<input class="form-control" type="file" name="proof" accept="image/jpeg,image/png,image/webp" required></label><button class="btn btn-success" type="submit">Submit payment for verification</button><p>Submitting a screenshot does not confirm payment. Batch assignment is managed separately by Yogshala.</p></form></div>';
        } else html+='<p>Match the UTR, receiver and exact amount against your bank or UPI statement. A screenshot alone is not payment confirmation. Approve UPI requests here; do not record them again using the separate received-payment form.</p>';
        html+='<h4 class="mt-4">'+(role==='student'?'Your payment requests':'Payment requests')+'</h4>';
        if(!data.requests.length) html+='<p>No payment requests yet.</p>';
        for(const row of data.requests) {
            html+='<article class="manual-payment-request"><strong>'+escape(role==='admin'?row.student_name+' ('+row.email+')':row.plan_name)+'</strong><p>'+escape(row.plan_name)+' · INR '+(row.amount/100).toLocaleString('en-IN')+' · '+escape(row.status)+'</p><p>UTR: '+escape(row.transaction_id)+'</p>';
            if(row.review_note)html+='<p>Review note: '+escape(row.review_note)+'</p>';
            if(role==='admin') {
                html+='<a target="_blank" rel="noopener noreferrer" href="api/paymentProof.php?file='+encodeURIComponent(row.proof_file)+'">View payment screenshot</a>';
                if(row.status==='pending')html+='<form class="manual-review-form" data-request="'+Number(row.id)+'"><label>Review note<input name="note" class="form-control" maxlength="500"></label><label><input type="checkbox" name="checked"> I matched this transaction and amount in the bank / UPI statement.</label><div><button name="decision" value="approved" class="btn btn-success">Approve and activate membership</button> <button name="decision" value="rejected" class="btn btn-outline-danger">Reject with note</button></div></form>';
            }
            html+='</article>';
        }
        section.innerHTML=html;
        section.querySelector('#manual-payment-form')?.addEventListener('submit',async event=>{
            event.preventDefault();const button=event.submitter;button.disabled=true;
            try {
                const body=new FormData(event.target);body.set('token',session.token);
                const file=body.get('proof');if(!file || file.size>2*1024*1024)throw Error('Choose an image smaller than 2 MB.');
                const response=await fetch('api/manual-payments.php?action=submit',{method:'POST',body});
                const result=await response.json();if(!response.ok || !result.success)throw Error(result.message||'Submission failed.');
                await reload();notify(result.message);
            }catch(error){notify(error.message);}finally{button.disabled=false;}
        });
        section.querySelectorAll('.manual-review-form').forEach(form=>form.addEventListener('submit',async event=>{
            event.preventDefault();const button=event.submitter;const fields=new FormData(form);const decision=button.value;
            if(decision==='approved' && !fields.has('checked')){notify('Check the transaction in your bank statement and tick the confirmation first.');return;}
            if(decision==='rejected' && !String(fields.get('note')).trim()){notify('Enter a reason for rejection.');return;}
            form.querySelectorAll('button').forEach(b=>b.disabled=true);
            try {const result=await api('manual-payments.php?action=review',{id:Number(form.dataset.request),decision,note:fields.get('note'),checked:fields.has('checked')?'yes':'no'});await reload();notify(result.message);}
            catch(error){notify(error.message);}finally{form.querySelectorAll('button').forEach(b=>b.disabled=false);}
        }));
    }catch(error){section.innerHTML='<h3>'+title+'</h3><p role="alert">'+escape(error.message)+'</p>';}
};
