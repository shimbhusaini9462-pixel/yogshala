'use strict';
const membershipFees=window.updateFees;
const joinPackagePrices={
 weekly:{Indian:{'General / Hatha Yoga':1200,'Power / Slimming Yoga':1600,'Therapy Yoga':3500,'Pregnancy Yoga':2500},International:{'General / Hatha Yoga':58,'Therapy Yoga':90}},
 ten:{Indian:{'General / Hatha Yoga':3200,'Power / Slimming Yoga':4200,'Therapy Yoga':10500,'Pregnancy Yoga':7500},International:{'General / Hatha Yoga':95,'Therapy Yoga':142}},
 private:{Indian:{'General / Hatha Yoga':1200,'Therapy Yoga':2000},International:{'General / Hatha Yoga':16,'Therapy Yoga':21}},
 shared:{Indian:{'General / Hatha Yoga':[6300,3000],'Power / Slimming Yoga':[8100,3850],'Therapy Yoga':[23400,null]},International:{'General / Hatha Yoga':[316,147],'Therapy Yoga':[632,295]}},
 home:{Indian:{'Monthly Home Yoga':15000,'General / Hatha Yoga - Single':1500,'Therapy Yoga - Single':2200,'General / Hatha Yoga - Couple':2000,'Group of 3 or More':null},International:{'General / Hatha Yoga - Single':26,'Therapy Yoga - Single':37,'General / Hatha Yoga - Couple':37,'Group of 3 or More':null}},
 hotel:{Indian:{'Group Yoga - Per Person':750,'Couple Yoga - Total for 2':2000,'Single / Private Yoga':2500},International:{'Group Yoga - Per Person':8,'Couple Yoga - Total for 2':21,'Single / Private Yoga':26}}
};
let membershipCourses=null,lastPackageKey='membership';
window.updateFees=function(){
 const type=document.getElementById('packageType');if(!type)return membershipFees();
 const market=document.getElementById('clientType').value,course=document.getElementById('course'),mode=document.getElementById('mode'),fees=document.getElementById('fees'),details=document.getElementById('packageDetails');
 if(!membershipCourses)membershipCourses=[...course.options].map(o=>({text:o.text,value:o.value}));
 document.getElementById('packageAudienceField').hidden=type.value!=='shared';
 if(type.value==='membership'){
  if(lastPackageKey!=='membership'){course.replaceChildren(...membershipCourses.map(o=>new Option(o.text,o.value)));mode.replaceChildren(new Option('-- Select Mode --',''),new Option('Online','Online'),new Option('Offline','Offline'));mode.options[1].id='onlineOption';}
  mode.disabled=false;lastPackageKey='membership';membershipFees();details.textContent='Regular membership fees. Confirm availability and payment with Yogshala.';return;
 }
 const key=type.value+market,prices=joinPackagePrices[type.value][market];
 if(lastPackageKey!==key){course.replaceChildren(new Option('-- Select Yoga Type --',''),...Object.keys(prices).map(name=>new Option(name,name)));lastPackageKey=key;}
 mode.replaceChildren(new Option(type.value==='home'?'Home Visit':type.value==='hotel'?'Hotel Yoga':'At Centre','Offline'));mode.disabled=true;
 let value=prices[course.value];if(Array.isArray(value))value=value[document.getElementById('packageAudience').value==='couple'?0:1];
 const currency=market==='Indian'?'\u20b9':'$';
 let unit=type.value==='weekly'?' / 7 days':type.value==='ten'?' / 10 classes':type.value==='shared'?' / month':type.value==='private'?' / session':type.value==='hotel'?' / day':' / visit';
 if(type.value==='home'&&course.value==='Monthly Home Yoga')unit=' / month + distance charges';
 if(type.value==='shared')unit=(document.getElementById('packageAudience').value==='couple'?' total for 2':' per person')+unit;
 if((type.value==='home'&&course.value.includes('Couple'))||(type.value==='hotel'&&course.value.includes('Couple')))unit=' total for 2'+unit;
 fees.value=course.value?(value===null?'Contact for Pricing':currency+Number(value).toLocaleString('en-US')+unit):'';
 const notes={weekly:'7 consecutive days; up to 6 group sessions, 60 minutes each. Centre only; advance booking required.',ten:'10 sessions of 60 minutes. Suggested validity: 45 days. Advance booking required.',private:'One-to-one at centre; prior appointment and therapy assessment required. Separate from Personal Yoga memberships.',shared:'Monthly shared sessions; couple covers 2, group covers 3–5. Private couple instruction is separate.',home:'Selected Jaipur areas; instructor availability, advance appointment and therapy suitability assessment apply. Travel charges may apply.',hotel:'Confirmed Hotel Yoga daily rates; separate from Home Yoga visits.'};
 let status=type.value==='hotel'?'Confirmed rates. ':type.value==='private'&&market==='International'?'Confirmed daily pricing. ':type.value==='shared'&&market==='International'?(document.getElementById('packageAudience').value==='couple'?'Confirmed INR rate shown as approximate USD. ':'Proposed group pricing. '):'Proposed pricing; confirm before payment. ';
 if(type.value==='home'&&course.value==='Monthly Home Yoga')status='Monthly Home Yoga: distance charges extra. ';
 if(type.value==='hotel'&&market==='International')status+='USD amounts are approximate. ';
 details.textContent=status+notes[type.value];
};
document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('packageType'))updateFees();});
