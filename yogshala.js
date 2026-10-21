// Close the homepage mobile menu before scrolling to a section.
document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('homepage')) return;
    const menu = document.getElementById('navbarNav');
    if (!menu) return;
    menu.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (!link || link.getAttribute('href') === '#' || !menu.classList.contains('show')) return;
        if (window.bootstrap && window.bootstrap.Collapse) {
            window.bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
        }
    });
});

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
function updateFees(){

    let course = document.getElementById("course").value.trim();
    let modeSelect = document.getElementById("mode");
    let feesInput = document.getElementById("fees");
    let clientType = document.getElementById("clientType") ? document.getElementById("clientType").value : "Indian";

    let feesChartIndian = {
        "General Yoga": { Online: "₹ 1499", Offline: "₹ 3500" },
        "Power Yoga": { Online: "₹ 1169", Offline: "₹ 5400" },
        "Face Yoga": { Online: "₹ 1169", Offline: "₹ 5400" },
        "Slimming Yoga": { Online: "₹ 899", Offline: "₹ 5400" },
        "Pregnancy Yoga": { Online: "₹ 1259", Offline: "₹ 7199" },
        "Therapy Yoga": { Offline: "₹ 13000" }
    };

    let feesChartInternational = {
        "General Yoga": { Online: "$7 / day", Offline: "$10 / day" },
        "Power Yoga": { Online: "$12.63 / day", Offline: "$15.79 / day" },
        "Face Yoga": { Online: "$10.53 / day", Offline: "$8.42 / day" },
        "Slimming Yoga": { Online: "$10.53 / day", Offline: "$8.42 / day" },
        "Pregnancy Yoga": { Online: "$7.37 / day", Offline: "$9.47 / day" },
        "Therapy Yoga": { Offline: "$21.05 / day" }
    };

    let feesChart = clientType === "International" ? feesChartInternational : feesChartIndian;
      let onlineOption = document.getElementById("onlineOption");
    if (onlineOption) {
        if(course === "Therapy Yoga") {
            onlineOption.disabled = true;
            if(modeSelect.value === "Online") modeSelect.value = ""; // reset selection
        } else {
            onlineOption.disabled = false;
        }
    }
      if(course && modeSelect.value && feesChart[course] && feesChart[course][modeSelect.value]) {
        feesInput.value = feesChart[course][modeSelect.value];
    } else {
        feesInput.value = "";
    }
}

function updatePaymentOptions() {
    let clientType = document.getElementById("clientType") ? document.getElementById("clientType").value : "Indian";
    let paymentMethod = document.getElementById("paymentMethod");
    
    if (paymentMethod) {
        paymentMethod.innerHTML = '<option value="">-- Select Payment Method --</option>';
        if (clientType === "International") {
            paymentMethod.innerHTML += '<option value="PayPal">PayPal</option>';
            paymentMethod.innerHTML += '<option value="International Bank Transfer">International Bank Transfer</option>';
        } else {
            paymentMethod.innerHTML += '<option value="UPI">UPI</option>';
            paymentMethod.innerHTML += '<option value="Bank Transfer">Bank Transfer</option>';
            paymentMethod.innerHTML += '<option value="Cash">Cash</option>';
        }
    }
    if(paymentMethod)paymentMethod.innerHTML += '<option value="Offline">Offline Payment (Pay at Centre)</option>';
    togglePaymentDetails();
}

function togglePaymentDetails() {
    let paymentMethod = document.getElementById("paymentMethod") ? document.getElementById("paymentMethod").value : "";
    let clientType = document.getElementById("clientType") ? document.getElementById("clientType").value : "Indian";
    let bankDetails = document.getElementById("bankDetails");
    let indianBankDetails = document.getElementById("indianBankDetails");
    let internationalBankDetails = document.getElementById("internationalBankDetails");
    const proofField=document.getElementById('payment-proof-field');
    const proofInput=document.getElementById('payment-proof');
    if(proofField && proofInput){const needed=paymentMethod!=='' && !['Cash','Offline'].includes(paymentMethod);proofField.hidden=!needed;proofInput.required=needed;if(!needed)proofInput.value='';}

    if (bankDetails) {
        if (paymentMethod === "UPI" || paymentMethod === "Bank Transfer" || paymentMethod === "International Bank Transfer" || paymentMethod === "PayPal") {
            bankDetails.style.display = "block";
            
            if (clientType === "International") {
                if (indianBankDetails) indianBankDetails.style.display = "none";
                if (internationalBankDetails) internationalBankDetails.style.display = "block";
            } else {
                if (indianBankDetails) indianBankDetails.style.display = "block";
                if (internationalBankDetails) internationalBankDetails.style.display = "none";
            }
        } else {
            bankDetails.style.display = "none";
        }
    }
}
async function submitForm(){
    if (submitForm.pending) return;
    const enquiryForm=document.getElementById('join-enquiry-form');
    if(enquiryForm && !enquiryForm.reportValidity())return;
    const fields = ['name','phone','state','city','course','email','mode','fees','paymentMethod','clientType'];
    const data = Object.fromEntries(fields.map(key => [key, document.getElementById(key)?.value.trim() || '']));
    if(document.getElementById('packageType')) {data.packageType=document.getElementById('packageType').value;data.packageAudience=document.getElementById('packageType').value==='shared'?'group':'not applicable';data.packageDetails=document.getElementById('packageDetails').textContent;}
    data.participants=document.getElementById('participants-field')?.hidden?'1':document.getElementById('participants').value;
    if (Object.values(data).some(value => !value)) { alert('Please fill all the details.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !/^[+\d ()-]{7,25}$/.test(data.phone)) { alert('Please enter a valid email and phone number.'); return; }
    const proof=document.getElementById('payment-proof')?.files[0];
    if(!['Cash','Offline'].includes(data.paymentMethod) && !proof){alert('Attach your payment screenshot before submitting.');return;}
    if(proof && (proof.size>2*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(proof.type))){alert('Use a JPG, PNG or WebP screenshot up to 2 MB.');return;}
    const loader = document.getElementById('loader');
    submitForm.pending = true;
    if (loader) loader.style.display = 'block';
    try {
        const body=new FormData();Object.entries(data).forEach(([key,value])=>body.set(key,value));
        if(!['Cash','Offline'].includes(data.paymentMethod))body.set('paymentProof',proof);
        const response = await fetch('api/enquiry.php', { method:'POST', body });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save enquiry.');
        if (loader) loader.style.display = 'none';
        data.paymentStatus=['Cash','Offline'].includes(data.paymentMethod)?data.paymentMethod+' selected - payment pending':'Screenshot submitted - verification pending';
        const labels={name:'Name',phone:'WhatsApp',email:'Email',state:'State / Region',city:'City',clientType:'Client type',course:'Course / Plan',mode:'Class mode',participants:'Members',fees:'Total fee',paymentMethod:'Payment method',paymentStatus:'Payment status'};
        const message='NEW YOGA ENQUIRY #'+result.id+'\n\n'+Object.entries(labels).map(([key,label])=>label+': '+data[key]).join('\n');
        const whatsappUrl='https://wa.me/917689941298?text='+encodeURIComponent(message);
        const handoff=document.getElementById('enquiry-whatsapp-handoff');
        if(handoff){
            handoff.hidden=false;
            const link=document.getElementById('enquiry-whatsapp-link');link.href=whatsappUrl;
            handoff.scrollIntoView({block:'center'});
        }
        window.location.assign(whatsappUrl);
    } catch (error) {
        alert(error instanceof SyntaxError ? 'Open the website at http://127.0.0.1:8085 to submit your enquiry.' : error.message);
    } finally {
        submitForm.pending = false;
        if (loader) loader.style.display = 'none';
    }
}
function helpWhatsApp(){
  window.open("https://wa.me/917689941298", "_blank");
}

async function submitContactForm() {
    if (submitContactForm.pending) return;
    let name = document.getElementById("contactName").value;
    let email = document.getElementById("contactEmail").value;
    let phone = document.getElementById("contactPhone").value;
    let subject = document.getElementById("contactSubject").value;
    let messageText = document.getElementById("contactMessage").value;

    if (name === "" || phone === "" || messageText === "") {
        alert("Please fill in the required fields (Name, Phone, Message).");
        return;
    }

    let whatsappnumber = "917689941298";

    let message =
        "📩 NEW CONTACT ENQUIRY\n\n" +
        "Name: " + name + "\n" +
        "Phone: " + phone + "\n" +
        "Email: " + email + "\n" +
        "Subject: " + subject + "\n" +
        "Message: " + messageText;

    const button=document.querySelector('.contact-submit-btn');
    const room=window.open('about:blank','_blank');
    submitContactForm.pending=true;
    if(button) button.disabled=true;
    try {
        const response=await fetch('api/enquiry.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'contact',name:name.trim(),email:email.trim(),phone:phone.trim(),subject:subject.trim(),message:messageText.trim()})});
        const result=await response.json();
        if(!response.ok || !result.success) throw new Error(result.message || 'Unable to save message.');
        const url='https://wa.me/'+whatsappnumber+'?text='+encodeURIComponent(message);
        if(room) { room.opener=null; room.location.href=url; }
        else window.location.href=url;
    } catch(error) {
        if(room)room.close();
        alert(error instanceof SyntaxError ? 'Open the website at http://127.0.0.1:8085 to send your message.' : error.message);
    } finally {
        submitContactForm.pending=false;
        if(button)button.disabled=false;
    }
}



// Testimonial Slider
document.addEventListener('DOMContentLoaded', function () {
    const slider = document.querySelector('.testimonial-slider');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const cards = document.querySelectorAll('.testimonial-card');
    if (!slider || cards.length === 0) return;
    let currentIndex = 0;
    const totalSlides = cards.length;

    function updateSlider() {
        const cardWidth = cards[0].offsetWidth + 30; // card width + margin
        slider.style.transform = `translateX(${-currentIndex * cardWidth}px)`;
    }

    if(nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentIndex < totalSlides - 1) {
                currentIndex++;
            } else {
                currentIndex = 0; // Loop back to start
            }
            updateSlider();
        });
    }

    if(prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
            } else {
                currentIndex = totalSlides - 1; // Loop to end
            }
            updateSlider();
        });
    }

    // Auto-slide functionality (optional)
    // setInterval(() => {
    //     if (nextBtn) nextBtn.click();
    // }, 5000);

    window.addEventListener('resize', updateSlider);
});

// Initialize AOS Animation
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800, // Animation duration in ms
            once: true, // Animation ek hi baar chale jab scroll ho
            offset: 100, // Thoda screen me aane ke baad hi chalu ho
        });
    }
});

// Restore the existing home-page account menu from the PHP session.
document.addEventListener('DOMContentLoaded', async () => {
    const menu = document.getElementById('user-menu-dropdown');
    if (!menu) return;
    try {
        const response = await fetch('api/portal.php?action=session');
        const session = await response.json();
        if (!response.ok || !session.success) return;
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('signup-btn').style.display = 'none';
        menu.style.display = 'block';
        document.getElementById('user-menu-button').textContent = session.user.name;
        for (const [role, id] of [['student','client-dashboard-link'],['teacher','teacher-dashboard-link'],['admin','admin-dashboard-link']]) {
            document.getElementById(id).parentElement.hidden = session.user.role !== role;
        }
        document.getElementById('logout-menu-btn').addEventListener('click', async event => {
            event.preventDefault();
            try {
                const response = await fetch('api/logout.php', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:session.token})});
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message || 'Logout failed.');
                window.location.reload();
            } catch (error) { alert(error.message); }
        });
    } catch { /* Public pages remain available while the account service is offline. */ }
});
