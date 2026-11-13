'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=require('./php-cli.cjs');
const base=process.env.TEST_URL || 'http://127.0.0.1:8085/';
let id;
(async()=>{
    const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    assert(!html.includes('Razorpay'));
    assert(!html.includes('id="paymentMethod"'));
    assert(html.includes('id="enquiry-message"'));
    const data={name:'enquiry-test-'+Date.now(),phone:'9999999999',email:'enquiry-test@example.com',state:'Rajasthan',city:'Jaipur',course:'General Yoga',mode:'Online',clientType:'Indian',packageType:'membership',fees:'1',totalFees:1,paymentStatus:'Paid',razorpayPaymentId:'fake',paymentProof:'fake'};
    const response=await fetch(base+'api/enquiry.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result=await response.json();
    assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.success,true);
    id=result.id;assert(Number.isInteger(id) && id>0);
    assert(!result.order_id && !result.key);
    const saved=JSON.parse(sql(`$q=$pdo->prepare('SELECT details FROM enquiries WHERE id=?');$q->execute([${id}]);echo $q->fetchColumn();`));
    assert.equal(saved.paymentStatus,'Not collected');assert.equal(saved.enquiryStatus,'New enquiry');
    assert.equal(saved.totalFees,1499);assert(!saved.razorpayPaymentId && !saved.paymentProof);
    assert.equal(Number(sql(`echo $pdo->query('SELECT COUNT(*) FROM razorpay_enquiry_orders WHERE enquiry_id=${id}')->fetchColumn();`)),0);
    const invalid=await fetch(base+'api/enquiry.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,course:'Unknown course'})});
    assert.equal(invalid.status,400);
    console.log('PASS direct class enquiry saved without checkout, server-calculated fees, forged payment claims ignored, no payment order, invalid course rejected.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
    if(id)sql(`$pdo->prepare('DELETE FROM enquiries WHERE id=?')->execute([${id}]);`);
});
