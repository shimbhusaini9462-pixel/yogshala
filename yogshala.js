function updateFees(){

    let course = document.getElementById("course").value;
    let modeSelect = document.getElementById("mode");
    let feesInput = document.getElementById("fees");

    let feesChart = {
        "General Yoga": { Online: 799, Offline: 1200 },
        "Power Yoga": { Online: 899, Offline: 1500 },
        "Face Yoga": { Online: 1499, Offline: 1000 },
        "Slimming Yoga": { Online: 999, Offline: 1800 },
        "Pregnancy Yoga": { Online: 6999, Offline: 2200 },
        "Therapy Yoga": { Offline: 2000 }
    };
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
        feesInput.value = "₹ " + feesChart[course][modeSelect.value];
    } else {
        feesInput.value = "";
    }
}
function togglePaymentDetails() {
    let paymentMethod = document.getElementById("paymentMethod").value;
    let bankDetails = document.getElementById("bankDetails");
    if(paymentMethod === "UPI" || paymentMethod === "Bank Transfer") {
        bankDetails.style.display = "block";
    } else {
        bankDetails.style.display = "none";
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

   if(name=="" || phone=="" || state=="" || city=="" || course=="" || email=="" || mode=="" || paymentMethod==""){
        alert("Please fill all the details");
        return;
   }

   let whatsappnumber = "917689941298"; 

   let message =
    "🧘 NEW YOGA ENQUIRY\n\n" +
    "Name: " + name + "\n" +
    "Phone: " + phone + "\n" +
    "State: " + state + "\n" +
    "City: " + city + "\n" +
    "Email: " + email + "\n" +
    "Course: " + course + "\n" +
    "Mode: " + mode + "\n" +
    "Fees: " + fees + "\n" +
    "Payment Method: " + paymentMethod;

   window.open(
     "https://wa.me/" + whatsappnumber + "?text=" + encodeURIComponent(message),
     "_blank"
   );
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

