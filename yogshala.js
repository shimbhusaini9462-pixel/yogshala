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
        "https.wa.me/" + whatsappnumber + "?text=" + encodeURIComponent(message),
        "_blank"
    );
}