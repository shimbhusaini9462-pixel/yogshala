// Shared online plan amounts: calculate in paise, then convert to USD cents.
window.yogshalaOnlinePlans = [
 {key:'monthly',name:'Monthly',course:'Monthly - 20 Live Classes',months:1,discount:0},
 {key:'quarterly',name:'Quarterly',course:'Quarterly - 60 Live Classes',months:3,discount:15},
 {key:'halfyearly',name:'Half-Yearly',course:'Half-Yearly - 6 Months',months:6,discount:30},
 {key:'annual',name:'Annual',course:'Annual - Unlimited Live Classes',months:12,discount:50}
].map(plan=>{
 const paise=149900*plan.months*(100-plan.discount)/100;
 return {...plan,Indian:paise/100,International:Math.round(paise*2/95)/100};
});
