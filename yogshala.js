function test(){
    alert("hello");
}
function submitForm(){
   let name=document.getElementById("name").value;
   let phone=document.getElementById("phone").value;
   let state=document.getElementById("state").value;
   let city=document.getElementById("city").value;
   let course=document.getElementById("course").value;
   let email=document.getElementById("email").value;
    if(name=="" || phone=="" || state=="" || city=="" || course=="" || email==""){
        alert("Please fill all the details");
        return;
    }
    let whatsappnumber="917689941298"; 
    let massege = 
    "NEW YOGA ENQUARY \n\n" +
    "Name: " + name + "\n" +
    "Phone: " + phone + "\n" +
    "State: " + state + "\n" +
    "City: " + city + "\n" +
    "E-mail: " + email + "\n" +
    "Course: " + course;
window.open(
    "https://wa.me/" + whatsappnumber + "?text=" + encodeURIComponent(massege),"_blank"
);



document.getElementById("name").value="";
document.getElementById("phone").value="";
document.getElementById("state").value="";
document.getElementById("email").value="";
document.getElementById("city").value="";
document.getElementById("course").selectedIndex=0;
}