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

async function submitForm(){
    if(submitForm.pending)return;
    const form=document.getElementById('join-enquiry-form');
    if(!form || !form.reportValidity())return;
    const output=document.getElementById('enquiry-message');
    const fields=['name','phone','state','city','course','email','mode','clientType'];
    const data=Object.fromEntries(fields.map(key=>[key,document.getElementById(key)?.value.trim() || '']));
    data.packageType=document.getElementById('packageType')?.value || 'membership';
    data.participants=document.getElementById('participants-field')?.hidden?'1':document.getElementById('participants')?.value || '1';
    if(Object.values(data).some(value=>!value)){if(output)output.textContent='Please complete all fields.';return;}
    submitForm.pending=true;
    const button=form.querySelector('button[type="submit"]');
    if(button)button.disabled=true;
    if(output)output.textContent='Sending your enquiry...';
    try {
        const response=await fetch('api/enquiry.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        const result=await response.json();
        if(!response.ok || !result.success)throw new Error(result.message || 'Unable to send your enquiry. Please try again.');
        if(output)output.textContent=result.message+' Reference #'+result.id+'.';
    }catch(error){if(output)output.textContent=error instanceof SyntaxError?'Unable to send your enquiry. Please try again.':error.message;}
    finally {submitForm.pending=false;if(button)button.disabled=false;}
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
