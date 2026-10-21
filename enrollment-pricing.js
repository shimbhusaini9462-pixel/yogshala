'use strict';
const membershipFees=window.updateFees;
const joinPackagePrices=window.yogshalaFeeCatalog.packages;
let membershipCourses=null,lastPackageKey='membership',packageOptions=null;
window.updateFees=function(){
 const type=document.getElementById('packageType');if(!type)return membershipFees();
 const market=document.getElementById('clientType').value,course=document.getElementById('course'),mode=document.getElementById('mode'),fees=document.getElementById('fees'),details=document.getElementById('packageDetails');
 if(!packageOptions)packageOptions=[...type.options].map(o=>({text:o.text,value:o.value}));
 const previousType=type.value;
 type.replaceChildren(...packageOptions.map(o=>new Option(o.text,o.value)));
 type.value=previousType;
 if(!membershipCourses)membershipCourses=[...course.options].map(o=>({text:o.text,value:o.value}));
 if(type.value==='membership'){
  if(lastPackageKey!=='membership'){course.replaceChildren(...membershipCourses.map(o=>new Option(o.text,o.value)));course.selectedIndex=1;mode.replaceChildren(new Option('Online','Online'),new Option('Offline','Offline'));mode.options[0].id='onlineOption';}
  mode.disabled=false;lastPackageKey='membership';
  const available=window.yogshalaFeeCatalog.membership[market]?.[course.value.trim()];
  const online=document.getElementById('onlineOption');if(online)online.disabled=!!available&&!Object.hasOwn(available,'Online');
  if(available&&!Object.hasOwn(available,mode.value))mode.value=Object.keys(available)[0];
  if(fees.value)fees.value+=market==='Indian'?' / month':'';
  details.textContent=market==='Indian'?'Regular membership: monthly INR fees; course offers follow the Classes page. Therapy Yoga is available offline only.':'Regular membership: daily USD fees, including the listed 20% discount. Therapy Yoga is available offline only.';
  renderJoinRates(type.value,market);return;
 }
 const key=type.value+market,prices=joinPackagePrices[type.value][market];
 if(lastPackageKey!==key){const previousCourse=course.value;course.replaceChildren(new Option(type.value==='onlinePlan'?'-- Select Plan Duration --':'-- Select Yoga Type --',''),...Object.keys(prices).map(name=>new Option(name,name)));if(Object.hasOwn(prices,previousCourse))course.value=previousCourse;else course.selectedIndex=1;lastPackageKey=key;}
 mode.replaceChildren(new Option(type.value==='onlinePlan'?'Online':type.value==='home'?'Home Visit':type.value==='hotel'?'Hotel Yoga':'At Centre',type.value==='onlinePlan'?'Online':'Offline'));mode.disabled=false;
 const value=prices[course.value];
 const currency=market==='Indian'?'\u20b9':'$';
 let unit=type.value==='weekly'?' / 7 days':type.value==='ten'?' / 10 classes':type.value==='shared'?' / month':type.value==='private'?' / session':type.value==='hotel'?' / day':' / visit';
 if(type.value==='home'&&course.value==='Monthly Home Yoga')unit=' / month + distance charges';
 if(type.value==='home'&&course.value==='Group of 3 or More')unit=' per person / visit';
 if(type.value==='onlinePlan')unit=course.value.startsWith('Quarterly')?' / 3 months':course.value.startsWith('Half-Yearly')?' / 6 months':course.value.startsWith('Annual')?' / year':' / month';
 if(type.value==='shared')unit=' per person'+unit;
 fees.value=course.value?(value===null?'Contact for Pricing':(market==='International'&&(type.value==='hotel'||type.value==='onlinePlan')?'Approx. ':'')+currency+Number(value).toLocaleString('en-US',{minimumFractionDigits:Number.isInteger(Number(value))?0:2,maximumFractionDigits:2})+unit):'';
 const notes={weekly:'7 consecutive days; up to 6 group sessions, 60 minutes each. Centre only; advance booking required.',ten:'10 sessions of 60 minutes. Suggested validity: 45 days. Advance booking required.',private:'One-to-one at centre; prior appointment and therapy assessment required. Separate from Personal Yoga memberships.',shared:'Monthly shared sessions for groups of 3 to 5; fees are per person.',home:'Selected Jaipur areas; instructor availability, advance appointment and therapy suitability assessment apply. Travel charges may apply.',hotel:'Confirmed Hotel Yoga daily rates; separate from Home Yoga visits.'};
 let status=type.value==='hotel'?'Confirmed rates. ':type.value==='private'&&market==='International'?'Confirmed daily pricing. ':type.value==='shared'&&market==='International'?'Proposed group pricing. ':'Proposed pricing; confirm before payment. ';
 if(type.value==='home'&&course.value==='Monthly Home Yoga')status='Monthly Home Yoga: distance charges extra. ';
 if(type.value==='hotel'&&market==='International')status+='USD amounts are approximate. ';
 details.textContent=status+notes[type.value];
 if(type.value==='onlinePlan')details.textContent=market==='Indian'?'Online membership with access to your assigned batch. Monthly: 20 live classes; quarterly: 60 live classes and 1 personal consultation; annual: unlimited live classes and 4 personal consultations. Confirm batch availability with Yogshala.':'International clients use the separate daily USD rates listed on the Classes page.';
 renderJoinRates(type.value,market);
};

function renderJoinRates(type,market){
 calculateLiveFee(type,market);
 renderJoinConditions(type,market);
 renderSelectedFeeSummary(type,market);
 const announcement=document.getElementById('fee-announcement');if(announcement)announcement.textContent=document.getElementById('fees').value;
 const list=document.getElementById('join-rate-list');if(!list)return;
 list.replaceChildren();
 const currency=market==='Indian'?'\u20b9':'$';
 const format=value=>value===null?'Contact for Pricing':currency+Number(value).toLocaleString('en-US',{minimumFractionDigits:Number.isInteger(Number(value))?0:2,maximumFractionDigits:2});
 const add=(name,rate)=>{const row=document.createElement('div');row.className='join-rate-row';const label=document.createElement('span');label.textContent=name;const amount=document.createElement('strong');amount.textContent=rate;row.append(label,amount);list.append(row);};
 if(type==='membership'){
  const rates=market==='Indian'?{'General / Hatha Yoga':[1499,3500],'Power Yoga':[1169,5400],'Face Yoga':[1169,5400],'Slimming Yoga':[899,5400],'Pregnancy Yoga':[1259,7199],'Therapy Yoga':[null,13000]}:{'General / Hatha Yoga':[7,10],'Power Yoga':[12.63,15.79],'Face Yoga':[10.53,8.42],'Slimming Yoga':[10.53,8.42],'Pregnancy Yoga':[7.37,9.47],'Therapy Yoga':[null,21.05]};
  for(const [name,values] of Object.entries(rates))add(name,`Online: ${values[0]===null?'Not available':format(values[0])} | Centre: ${format(values[1])} / ${market==='Indian'?'month':'day'}`);
 }else{
  for(const [name,value] of Object.entries(joinPackagePrices[type][market])){
   let unit={weekly:' / 7 days',ten:' / 10 classes',private:' / session',shared:' / month',home:' / visit',hotel:' / day',onlinePlan:' / month'}[type];
   if(type==='home'&&name==='Monthly Home Yoga')unit=' / month + distance charges';
   if(type==='home'&&name==='Group of 3 or More')unit=' per person / visit';
   if(type==='onlinePlan')unit=name.startsWith('Quarterly')?' / 3 months':name.startsWith('Half-Yearly')?' / 6 months':name.startsWith('Annual')?' / year':' / month';
   add(name,(market==='International'&&(type==='onlinePlan'||type==='hotel')?'Approx. ':'')+format(value)+(value===null?'':(type==='shared'?' per person':'')+unit));
  }
 }
}


function renderJoinConditions(type,market){
 const conditions=document.getElementById('packageConditions'),details=document.getElementById('packageDetails');
 const source=window.joinPackageConditions?.[market]?.[type];
 let lines=source?[source.period,...source.conditions]:[];
 if(type==='membership')lines=[market==='Indian'?'Fees are per month in INR. General online membership is INR 1,499; other course offers follow the Classes page.':'Fees are per day in USD; listed fees include 20% off.','Therapy Yoga is available offline only.'];
 if(type==='hotel')lines=['Per-day rates; separate from proposed Home Yoga visits.',market==='International'?'USD amounts are approximate conversions.':'Rates are in INR.','Group Yoga is priced per person; Single / Private Yoga covers one person.'];
 if(type==='onlinePlan')lines=['Access to your assigned batch.','Monthly: INR 1,499; 20 live classes; no personal consultation included.','3 months: INR 1,499 x 3 less 15% = INR 3,822.45; 60 live classes and 1 personal consultation.', '6 months: INR 1,499 x 6 less 30% = INR 6,295.80.','12 months: INR 1,499 x 12 less 50% = INR 8,994; unlimited live classes and 4 personal consultations.','Live classes take place inside your dashboard.','Indian plans are priced in INR.'];
 if(conditions)conditions.replaceChildren(...lines.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 details.textContent=(source?source.status+'. ':'')+lines.join(' ');
 if(type==='onlinePlan'&&market==='International'){
  lines=['Foreign online plans are twice the Indian online plan totals, converted at INR 95 per USD and rounded to two decimals.','Monthly: $31.56 for 1 month; 20 live classes.','Quarterly: $80.47 for 3 months; 15% duration discount; 60 live classes and 1 personal consultation.','Half-yearly: $132.54 for 6 months; 30% duration discount.','Annual: $189.35 for 12 months; 50% duration discount; unlimited live classes and 4 personal consultations.','Access to your assigned batch; live classes inside your dashboard.'];
  conditions.replaceChildren(...lines.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));details.textContent=lines.join(' ');
 }
 const fee=document.getElementById('fees').value;
 const submit=document.querySelector('#join-enquiry-form button[type="submit"]');
 if(submit)submit.textContent=fee==='Contact for Pricing'?'Request Pricing & Availability':'Submit Class Enquiry';
}

document.addEventListener('DOMContentLoaded',()=>{
 const type=document.getElementById('packageType');if(!type)return;
 const params=new URLSearchParams(location.search),requestedType=params.get('package'),market=params.get('client');
 if(['Indian','International'].includes(market)){document.getElementById('clientType').value=market;updatePaymentOptions();}
 if([...type.options].some(o=>o.value===requestedType))type.value=requestedType;
 updateFees();
 if(type.value==='membership'&&market==='International'&&(requestedType==='onlinePlan'||params.get('mode')==='Online')){document.getElementById('course').value='General Yoga';document.getElementById('mode').value='Online';updateFees();}
 if(type.value==='onlinePlan'){
  const plans={monthly:'Monthly - 20 Live Classes',quarterly:'Quarterly - 60 Live Classes',halfyearly:'Half-Yearly - 6 Months',annual:'Annual - Unlimited Live Classes'};
  if(plans[params.get('plan')]){document.getElementById('course').value=plans[params.get('plan')];updateFees();}
 }
});

function renderSelectedFeeSummary(type,market){
 const summary=document.getElementById('selected-fee-summary');if(!summary)return;
 const fee=document.getElementById('fees').value;
 summary.replaceChildren();
 if(!fee)summary.textContent='Select your course and class mode to see the fee.';
}

function calculateLiveFee(type,market){
 const course=document.getElementById('course').value.trim(),mode=document.getElementById('mode').value;
 const field=document.getElementById('participants-field'),members=document.getElementById('participants'),help=document.getElementById('participants-help'),breakdown=document.getElementById('fee-breakdown'),fees=document.getElementById('fees');
 const group=type==='shared'||(type==='home'&&course==='Group of 3 or More')||(type==='hotel'&&course==='Group Yoga - Per Person');
 const previouslyHidden=field.hidden;field.hidden=!group;members.required=group;
 const minimum=type==='hotel'?1:3;
 members.min=minimum;
 if(type==='shared')members.max=5;else members.removeAttribute('max');
 if(group&&previouslyHidden)members.value=minimum;
 help.textContent=type==='shared'?'3 to 5 members. Fees are calculated for the whole group.':type==='home'?'3 or more members. Fees are calculated for the whole group.':'Enter the number of participants.';
 const rate=type==='membership'?window.yogshalaFeeCatalog.membership[market]?.[course]?.[mode]:joinPackagePrices[type]?.[market]?.[course];
 breakdown.textContent='';
 if(typeof rate!=='number'){fees.value='';return;}
 const quantity=group?Number(members.value):1;
 if(!Number.isSafeInteger(quantity)||quantity<minimum&&group||type==='shared'&&quantity>5){fees.value='';breakdown.textContent=type==='shared'?'Enter 3 to 5 members to calculate the total.':'Enter a valid number of members to calculate the total.';return;}
 const format=n=>(market==='Indian'?'\u20b9':'$')+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 let period=type==='membership'?(market==='Indian'?'month':'day'):({weekly:'7 days',ten:'10 classes',private:'session',shared:'month',home:'visit',hotel:'day',onlinePlan:'month'})[type];
 if(type==='home'&&course==='Monthly Home Yoga')period='month';
 if(type==='onlinePlan'){const plan=window.yogshalaOnlinePlans.find(p=>p.course===course);period=plan.months===1?'month':plan.months+' months';}
 const total=Math.round((rate*quantity+Number.EPSILON)*100)/100;
 fees.value=format(total)+(group?' total for '+quantity+' people':'')+' / '+period+(type==='home'?' + travel charges, if applicable':'');
 if(group)breakdown.textContent=format(rate)+' per person '+String.fromCharCode(215)+' '+quantity+' members = '+format(total);
 else if(type==='onlinePlan'){
  const plan=window.yogshalaOnlinePlans.find(p=>p.course===course);
  breakdown.textContent=plan.discount?plan.months+' months '+String.fromCharCode(183)+' '+plan.discount+'% discount included':'';
 }
}
