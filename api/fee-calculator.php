<?php
function feeCatalog() {
    $catalog=json_decode(file_get_contents(__DIR__.'/../database/fee-catalog.json'),true,512,JSON_THROW_ON_ERROR);
    foreach ($catalog['online']['plans'] as $plan) {
        $inr=round($catalog['online']['monthly']*$plan['months']*(100-$plan['discount'])/100,2);
        $catalog['packages']['onlinePlan']['Indian'][$plan['course']]=$inr;
        $catalog['packages']['onlinePlan']['International'][$plan['course']]=round($inr*$catalog['online']['foreignMultiplier']/$catalog['online']['inrPerUsd'],2);
    }
    return $catalog;
}
function calculateEnquiryFee($data) {
    $catalog=feeCatalog();$market=$data['clientType'];$type=$data['packageType'] ?? 'membership';$course=$data['course'];$mode=$data['mode'];
    if (!isset($catalog['membership'][$market]) || !is_string($type)) throw new InvalidArgumentException('Choose a valid client type and package.');
    if ($type==='membership') {
        $rate=$catalog['membership'][$market][$course][$mode] ?? null;
        $unit=$market==='Indian'?'month':'day';
    } else {
        $rate=$catalog['packages'][$type][$market][$course] ?? null;
        if ($mode!==($type==='onlinePlan'?'Online':'Offline')) throw new InvalidArgumentException('Class mode does not match this package.');
        $unit=['weekly'=>'7 days','ten'=>'10 classes','private'=>'session','shared'=>'month','home'=>'visit','hotel'=>'day','onlinePlan'=>'month'][$type] ?? '';
        if ($type==='onlinePlan') foreach ($catalog['online']['plans'] as $plan) if ($plan['course']===$course) $unit=$plan['months']===1?'month':$plan['months'].' months';
        if ($type==='home' && $course==='Monthly Home Yoga') $unit='month';
    }
    if (!is_numeric($rate)) throw new InvalidArgumentException('Choose an available course, package and class mode.');
    $group=$type==='shared'||($type==='home'&&$course==='Group of 3 or More')||($type==='hotel'&&$course==='Group Yoga - Per Person');
    $members=1;
    if ($group) {
        $members=filter_var($data['participants'] ?? null,FILTER_VALIDATE_INT);
        if ($members===false || $members<($type==='hotel'?1:3) || ($type==='shared'&&$members>5)) throw new InvalidArgumentException('Enter a valid group size (monthly groups: 3 to 5 people; home groups: 3 or more).');
    }
    $currency=$market==='Indian'?'INR':'USD';$total=round($rate*$members,2);
    $fees=($currency==='INR'?'₹':'$').number_format($total,2,'.',',').($group?' total for '.$members.' people':'').' / '.$unit.($type==='home'?' + travel charges, if applicable':'');
    return ['packageType'=>$type,'participants'=>$members,'unitFee'=>(float)$rate,'totalFees'=>$total,'feeCurrency'=>$currency,'feePeriod'=>$unit,'fees'=>$fees,'travelChargesPending'=>$type==='home'];
}
