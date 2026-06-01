function updateFees(){

    let course = document.getElementById("course").value;
    let modeSelect = document.getElementById("mode");
    let feesInput = document.getElementById("fees");
    let clientType = document.getElementById("clientType") ? document.getElementById("clientType").value : "Indian";

    let feesChartIndian = {
        "General Yoga": { Online: "₹ 899", Offline: "₹ 3500" },
        "Power Yoga": { Online: "₹ 1169", Offline: "₹ 5400" },
        "Face Yoga": { Online: "₹ 1169", Offline: "₹ 5400" },
        "Slimming Yoga": { Online: "₹ 899", Offline: "₹ 5400" },
        "Pregnancy Yoga": { Online: "₹ 1259", Offline: "₹ 7199" },
        "Therapy Yoga": { Offline: "₹ 13000" }
    };

    let feesChartInternational = {
        "General Yoga": { Online: "$ 7 / day", Offline: "$ 10 / day" },
        "Power Yoga": { Online: "$ 12.63 / day", Offline: "$ 15.79 / day" },
        "Face Yoga": { Online: "$ 10.53 / day", Offline: "$ 8.42 / day" },
        "Slimming Yoga": { Online: "$ 10.53 / day", Offline: "$ 8.42 / day" },
        "Pregnancy Yoga": { Online: "$ 7.37 / day", Offline: "$ 9.47 / day" },
        "Therapy Yoga": { Offline: "$ 21.05 / day" }
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
    togglePaymentDetails();
}

function togglePaymentDetails() {
    let paymentMethod = document.getElementById("paymentMethod") ? document.getElementById("paymentMethod").value : "";
    let clientType = document.getElementById("clientType") ? document.getElementById("clientType").value : "Indian";
    let bankDetails = document.getElementById("bankDetails");
    let indianBankDetails = document.getElementById("indianBankDetails");
    let internationalBankDetails = document.getElementById("internationalBankDetails");

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
function submitForm(){

   let name  = document.getElementById("name").value;
   let phone = document.getElementById("phone").value;
   let state = document.getElementById("state").value;
   let city  = document.getElementById("city").value;
   let course= document.getElementById("course").value;
   let email = document.getElementById("email").value;
   let mode  = document.getElementById("mode").value;
   let fees  = document.getElementById("fees").value;
   let paymentMethod = document.getElementById("paymentMethod").value;
   let clientTypeElem = document.getElementById("clientType");
   let clientType = clientTypeElem ? clientTypeElem.value : "Indian";

   if(name=="" || phone=="" || state=="" || city=="" || course=="" || email=="" || mode=="" || paymentMethod==""){
        alert("Please fill all the details");
        return;
   }

   // 1. स्क्रीन पर लोडर दिखाएं
   let loader = document.getElementById('loader');
   if(loader) loader.style.display = 'block';

   let whatsappnumber = "917689941298"; 

   let message =
    "🧘 NEW YOGA ENQUIRY\n\n" +
    "Name: " + name + "\n" +
    "Phone: " + phone + "\n" +
    "State: " + state + "\n" +
    "City: " + city + "\n" +
    "Email: " + email + "\n" +
    "Client Type: " + clientType + "\n" +
    "Course: " + course + "\n" +
    "Mode: " + mode + "\n" +
    "Fees: " + fees + "\n" +
    "Payment Method: " + paymentMethod;

   // 2. Google Script को डेटा भेजें (Background Process)
   fetch('YOUR_GOOGLE_SCRIPT_URL', {
       method: 'POST',
       mode: 'no-cors',
       body: JSON.stringify({
           name: name,
           amount: fees,
           client_phone: phone,
           client_message: message,
           id: "ENQ-" + Date.now()
       })
   }).then(() => {
       // 3. लोडर को छुपाएं
       if(loader) loader.style.display = 'none';

       // 4. क्लाइंट को मैसेज दिखाएं
       if (clientType === "International") {
           Swal.fire({
               title: 'Enquiry Received',
               text: 'Hello ' + name + ', your details have been received. Please complete your payment to confirm registration.',
               icon: 'info',
               confirmButtonColor: '#1a5276'
           }).then(() => {
               // 5. व्हाट्सएप पर रीडायरेक्ट करें
               window.location.href = "https://wa.me/" + whatsappnumber + "?text=" + encodeURIComponent(message);
           });
       } else {
           Swal.fire({
               title: 'सफलता!',
               text: 'नमस्ते ' + name + ', आपका फॉर्म सबमिट हो गया है। जल्द ही आपके नंबर (' + phone + ') पर डिटेल्स आ जाएंगी।',
               icon: 'success',
               confirmButtonColor: '#1a5276'
           }).then(() => {
               // 5. व्हाट्सएप पर रीडायरेक्ट करें
               window.location.href = "https://wa.me/" + whatsappnumber + "?text=" + encodeURIComponent(message);
           });
       }
   }).catch((err) => {
       if(loader) loader.style.display = 'none';
       // In case of error, just proceed to WhatsApp
       window.location.href = "https://wa.me/" + whatsappnumber + "?text=" + encodeURIComponent(message);
   });
}
function helpWhatsApp(){
  window.open("https://wa.me/917689941298", "_blank");
}

function submitContactForm() {
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

    window.open(
        "https://wa.me/" + whatsappnumber + "?text=" + encodeURIComponent(message),
        "_blank"
    );
}


function register(){
  let name = document.getElementById("regName").value;
  let email = document.getElementById("regEmail").value;
  let pass = document.getElementById("regPass").value;

  if(name=="" || email=="" || pass==""){
    document.getElementById("regMsg").innerText="All fields required";
    return;
  }

  let user = {name,email,pass};
  localStorage.setItem("yogshala_user", JSON.stringify(user));

  alert("Registration Successful! Please Login");
  window.location.href="login.html";
}

function login(){
  let email = document.getElementById("loginEmail").value;
  let pass = document.getElementById("loginPass").value;

  let user = JSON.parse(localStorage.getItem("yogshala_user"));

  if(!user){
    document.getElementById("loginMsg").innerText="No account found. Please register.";
    return;
  }

  if(email === user.email && pass === user.pass){
    localStorage.setItem("yogshala_login","true");
    window.location.href="index.html";
  } else {
    document.getElementById("loginMsg").innerText="Invalid Email or Password";
  }
}

function logout(){
  localStorage.removeItem("yogshala_login");
  window.location.href="login.html";
}

// Testimonial Slider
document.addEventListener('DOMContentLoaded', function () {
    const slider = document.querySelector('.testimonial-slider');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const cards = document.querySelectorAll('.testimonial-card');
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
