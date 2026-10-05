// UK_SCENE_PART: uk-south-east/north-hampshire
/* North Hampshire: eight places, four composed views each. Yateley's three
   places have all four seasons per view: 68 scenes in this part.
   Yateley Common — open heather, gorse and scattered birch, rather than hills.
   Wyndham's Pool — the Common's wooded pond, reed margins and dusk wildlife.
     https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
   Yateley Green — the open common, its pond and wildflower margins.
     https://yateley-tc.gov.uk/our-services/open-spaces/
   Fleet Pond — broad freshwater, reedbeds, woodland and viewing platforms.
     https://www.hart.gov.uk/fleet-pond
   Basingstoke Canal at Fleet — enclosed towpath, still water and narrowboats.
     https://www.hart.gov.uk/sites/default/files/2023-04/Bas%20Canal%20appraisal%20and%20character.pdf
   Southwood Country Park — open meadows and Cove Brook's wetland corridor.
     https://www.rushmoor.gov.uk/southwoodcountrypark
   Southwood Woodland — regenerating birch, mature oaks, bluebells and ferns.
     https://www.rushmoor.gov.uk/community-parks-and-leisure/parks-and-outdoors/southwood-woodland/
   Farnborough's restored airship hangar — the uncovered steel frame, not an
   operational airship shed; its portal, bracing and long perspective are the art.
     https://airsciences.org.uk/rae-wind-tunnel-buildings/
   Town centres are public, approximate locality anchors from ukTowns().
   All views are SVG drawings; none contains a photograph or embedded text. */
function ukSouthEastPart4(T) {
  const { add, U, R, rnd, mv, linU, oak, grass, meadow, shimmer, lit, vista, cloud, streak, haze, birds } = T;
  // Uneven wooded banks: broad crowns, taller birches and gaps between trees.
  // Heights and widths vary independently, avoiding the old scalloped border.
  const woodline = (fill,y,amp,seed,x0=-160,x1=1760,foot=790,rim) => {
    const random=rnd(seed);let edge=`M${x0} ${foot}V${y}`,light='',branches='';
    for(let x=x0;x<x1;){const w=R(72+random()*137),h=R(13+random()*amp*1.8),yy=R(y+random()*14),a=R(x+w*.22),b=R(x+w*.64);
      edge+=`C${R(x+w*.05)} ${yy} ${R(x+w*.07)} ${yy-h} ${a} ${yy-h}Q${R(x+w*.39)} ${yy-h-R(h*.29)} ${R(x+w*.48)} ${yy-h+R(h*.23)}C${b} ${yy-h-R(h*.16)} ${R(x+w*.85)} ${yy-R(h*.7)} ${R(x+w*.92)} ${yy}L${x+w} ${yy}`;
      light+=`M${a} ${yy-h+4}q${R(w*.18)}-${R(h*.23)} ${R(w*.31)} ${R(h*.14)}`;
      if(h>55)branches+=`M${R(x+w*.47)} ${y+40}v-${R(h*.5)}l-${R(w*.13)}-${R(h*.23)}`;
      x+=w;
    }
    return `<path fill="${fill}" d="${edge}V${foot}H${x0}z"/><path fill="none" stroke="${rim||fill}" stroke-width="4" opacity=".38" stroke-linecap="round" d="${light}"/><path fill="none" stroke="#284f50" stroke-width="3" opacity=".16" d="${branches}"/>`;
  };
  const tree = (x, y, k, autumn = false, seed = 14) => oak(x, y, k, autumn ? '#725035' : '#174e3f', autumn ? '#c17c32' : '#388353', autumn ? '#f2c45f' : '#a6ca58', seed);
  const birch = (x, y, k, autumn = false) => {
    let bark = '';
    for (let i = 0; i < 8; i++) bark += `<path d="M${-7 + i % 3} ${-18 - i * 31}h${8 + i % 4}"/>`;
    return `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#d9ddd0" d="M-11 0l5-305h9L16 0z"/><path stroke="#788779" stroke-width="3" fill="none" d="M0-130l-65-97M1-206l60-63"/><g stroke="#53665a" stroke-width="3">${bark}</g>${mv('uksway2', { ad: '7s', dx: '3px' }, `<g fill="${autumn ? '#b4a35d' : '#8aab76'}" opacity=".92"><ellipse cx="-36" cy="-235" rx="61" ry="73"/><ellipse cx="26" cy="-273" rx="65" ry="96"/><ellipse cx="-15" cy="-332" rx="42" ry="53"/></g><g fill="${autumn ? '#e0c781' : '#bad29a'}" opacity=".6"><ellipse cx="32" cy="-300" rx="30" ry="56"/><ellipse cx="-56" cy="-251" rx="23" ry="38"/></g>`)}</g>`;
  };
  const reeds = (x, y, k, seed) => {
    const random = rnd(seed); let stalks = '', heads = '';
    for (let i = 0; i < 15; i++) { const a = R(x + (random() - .5) * 170 * k), h = R((60 + random() * 85) * k); stalks += `M${a} ${y}q-10-${h / 2} 4-${h}`; heads += `<path d="M${a + 4} ${y - h}v-${21 * k}"/>`; }
    return mv('uksway', { ad: '5s', dx: '3px' }, `<path fill="none" stroke="#697344" stroke-width="${3 * k}" d="${stalks}"/><g stroke="#786345" stroke-width="${6 * k}" stroke-linecap="round">${heads}</g>`);
  };
  const water = (path, y, seed, dusk = false) => {
    const id = U(), clip = U();
    return `<defs>${linU(id, [[0, dusk ? '#dbabb4' : '#89c9bb'], [.4, dusk ? '#738bc1' : '#348f99'], [1, '#174d70']], 0, y, 0, 900)}<clipPath id="${clip}"><path d="${path}"/></clipPath></defs><g clip-path="url(#${clip})"><path fill="url(#${id})" d="${path}"/>${shimmer(seed, 28, -160, 1760, y + 8, 890, dusk ? '#f5dab3' : '#d7e7d4', 45)}</g>`;
  };
  const dragonfly = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukbob', { ad: '4s', dy: '13px' }, '<g fill="#e4ebdc" opacity=".75"><ellipse cx="-15" cy="-8" rx="21" ry="5" transform="rotate(18)"/><ellipse cx="15" cy="-8" rx="21" ry="5" transform="rotate(-18)"/></g><path stroke="#447c88" stroke-width="5" stroke-linecap="round" d="M0-10V23"/><circle cy="-13" r="5" fill="#3a5960"/>')}</g>`;
  const duck = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukbob', { ad: '5s', dy: '3px' }, '<path fill="#d7d7bb" d="M-28 0q25-29 57-2L19 13H-15z"/><path fill="#446959" d="M15-3q-12-27 6-30 16 2 8 15v19z"/><path fill="#c8a366" d="M29-24l15 5-15 3z"/>')}<path fill="none" stroke="#d8e5ce" opacity=".65" stroke-width="2" d="M-47 18q44 12 85 0M-26 31h62"/></g>`;
  const bench = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#a28a64" d="M-75-48h150v12H-75zM-75-29H75v12H-75zM-80-8H80V5H-80z"/><path stroke="#465b52" stroke-width="7" d="M-56 28v-81M56 28v-81"/></g>`;
  const boardwalk = (side, dusk) => {
    let joints = ''; for (let i = 0; i < 10; i++) { const y = 756 + i * 16, spread = (y - 730) * .6; joints += `M${780 - spread} ${y}H${840 + spread}`; }
    const path = `<path fill="${dusk ? '#9b8879' : '#b5aa86'}" d="M610 900l176-178h45l189 178z"/><path fill="none" stroke="#7b7964" stroke-width="3" d="${joints}"/><path fill="none" stroke="#5f6d5e" stroke-width="7" d="M616 868l172-165M1009 868L830 703M659 874v-57M950 874v-57M733 790v-43M885 790v-43"/>`;
    return side ? `<g transform="translate(-310 0)">${path}</g>` : path;
  };
  const heather = (seed, x0, x1, y0, y1) => {
    const random = rnd(seed); let out = '';
    for (let i = 0; i < 17; i++) {
      const x = R(x0 + random() * (x1 - x0)), y = R(y0 + random() * (y1 - y0)), k = .5 + (y - y0) / (y1 - y0);let stems='',heads='';
      for(let j=0;j<7;j++){const xx=R(x+(random()-.5)*48*k),h=R((12+random()*22)*k);stems+=`M${xx} ${y}l${R((random()-.5)*10)}-${h}`;heads+=`M${xx} ${y-h}v${R(h*.4)}`;}
      out += `<path fill="#465b32" d="M${x-R(28*k)} ${y}q${R(6*k)}-${R(21*k)} ${R(27*k)}-${R(16*k)} ${R(22*k)}-${R(9*k)} ${R(30*k)} ${R(16*k)}z"/><path fill="none" stroke="#827149" stroke-width="${1.4*k}" d="${stems}"/><path fill="none" stroke="${['#b94c9b','#db7db6','#844a98','#e997c6'][i%4]}" stroke-width="${4*k}" stroke-linecap="round" stroke-dasharray="2 3" d="${heads}"/>`;
    }
    return mv('uksway', { ad: '6s', dx: '2px' }, out);
  };
  const gorse = (x,y,k) => `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#497047" d="M-85 0q-20-59 35-60-6-74 57-74 55 10 44 77 55-15 56 57z"/><path fill="none" stroke="#efc82e" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 21" d="M-64-20q-13-52 34-32M-20-58q-18-66 30-52M36-44q13-36 47-14M-24-19q39-40 64 2"/></g>`;
  const fern = (x,y,k) => {
    let fronds='';for(let i=0;i<8;i++){const yy=-15-i*11,w=43-i*4;fronds+=`M0 ${yy}q-${w} -27-${w+10} -9q${w*.5} 9 ${w+10} 9M0 ${yy}q${w} -27 ${w+10} -9q-${w*.5} 9-${w+10} 9`;}
    return `<g transform="translate(${x} ${y}) scale(${k})">${mv('uksway',{ad:'6.7s',to:'0px 0px'},`<path fill="#4a9b51" d="${fronds}"/><path fill="none" stroke="#aac35b" stroke-width="2" d="M0 0q-7-65 4-111"/>`)}</g>`;
  };
  const butterfly = (x,y,col,k=1) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukflutter',{ad:'9s',d:'-3s'},mv('ukflap',{ad:'.65s'},`<path fill="${col}" d="M0 0q-38-45-38-10 0 22 38 18 34-43 38-16 2 29-38 16z"/><path fill="#503943" d="M-2-9h4v26h-4z"/>`))}</g>`;
  const heath = v => {
    const autumn = v === 2;
    let h = `<path fill="${autumn ? '#a39666' : '#9b9e72'}" d="M-160 900V623Q790 577 1760 624V900z"/><path fill="#bdb497" d="${v === 1 ? 'M250 900Q1110 743 879 630h31Q1330 758 510 900z' : 'M667 900Q528 755 817 618h20Q675 749 901 900z'}"/>`;
    h += heather(4401 + v, -160, 590, 675, 893) + heather(4411 + v, 960, 1760, 652, 887);
    h += gorse(v===1?280:1260, v===1?834:768, v===1?.85:.6)+grass(4433+v,24,40,1510,874,40,'#a49b45');
    h += birch(v === 1 ? 1080 : 415, 733, v === 1 ? .9 : .55, autumn) + birch(v === 1 ? 1250 : 502, 725, .43, autumn);
    if (v === 2) h += `<path fill="#746749" d="M260 858l197-27 11 28-205 25z"/>${grass(4430, 22, 1060, 1660, 861, 84, '#958846')}`;
    else h += meadow(4440 + v, 15, 140, 540, 758, 850, ['#d7be66', '#ead28a']);
    if (v === 3) h += `<path fill="#4b5346" d="M1160 812v-137l-45-31 47 17 25-58-9 78 53 7-54 9 1 115z"/>${dragonfly(921, 676, .8)}`;
    return h;
  };
  const pond = (type, v) => {
    const fleet = type === 'fleet', green = type === 'green', dusk = v === 3;
    const y = fleet ? 625 : 688;
    let h = `<path fill="#7c9970" d="M-160 ${y - 36}Q800 ${y - 65} 1760 ${y - 17}V900H-160z"/>`;
    if (green) h += `<path fill="#a7b880" d="M-160 595H1760v119Q700 677-160 751z"/>${tree(1240, 701, .63, v === 2)}${bench(1014, 726, .65)}`;
    else h += woodline(dusk ? '#546b69' : '#547a63', y - 16, fleet ? 14 : 35, 4451, -160, 1760, y + 35, '#a8b791');
    const shape = green ? 'M157 795Q305 734 625 756Q896 754 1090 840L1020 900H78z'
      : v === 1 ? `M-160 ${y + 26}Q300 ${y - 9} 1760 ${y + 32}V900H-160z`
      : `M-160 ${y + 24}Q720 ${y - 5} 1760 ${y + 20}V900H-160z`;
    h += water(shape, green ? 770 : y + 15, 4460 + v, dusk);
    if (v === 0) h += fleet ? boardwalk(false, dusk) : `<path fill="#7b8963" d="M-160 900V815Q278 784 594 900z"/>` + tree(340, 868, .91, false) + reeds(1240, 862, .9, 4466);
    if (v === 1) h += `<path fill="#779077" d="M-160 900V760q240-67 690 140z"/>${reeds(435, 899, 1.2, 4471)}${reeds(155, 848, .8, 4472)}${dragonfly(715, 723, 1.05)}`;
    if (v === 2) h += `<path fill="#9e946f" d="M-160 900q630-110 1100 0zM1030 900q100-155 730-85v85z"/>` + tree(fleet ? 310 : 1210, 875, 1.04, true) + `${bench(737, 895, 1)}${meadow(4479, 12, 0, 320, 840, 900, ['#d7bd83', '#dbcfa6'])}`;
    if (v === 3) h += fleet ? `<path fill="#415f54" d="M-160 900q460-78 640 0z"/>${reeds(240, 900, 1.1, 4481)}${duck(963, 779, .7)}` : `<path fill="#6d7d60" d="M810 900Q1190 762 1760 791V900z"/>` + birch(1270, 880, .86) + bench(1073, 883, .65);
    if (!green) h += duck(fleet ? 1120 : 840, fleet ? 767 : 806, .7);
    if (green && v !== 1) h += meadow(4489, 18, 1160, 1580, 820, 895, ['#d9c688', '#eadcb0', '#ac95af']);
    return h;
  };
  const narrowboat = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukbob', { ad: '6s', dy: '3px' }, `<path fill="#344c55" d="M-220-18h445l-27 39h-386z"/><path fill="#5c7d71" d="M-175-18v-57h325l31 57z"/><path fill="#d4c7a3" d="M-180-75h336l11 11h-347z"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${-153 + i * 48}" y="-55" width="29" height="24" rx="3" fill="#adc4be"/>${lit(-153 + i * 48, -55, 29, 24)}`).join('')}<path stroke="#91745b" stroke-width="5" d="M-180-77v-23M154-76v-22"/>`)}</g>`;
  const canal = v => {
    const dusk = v === 3;
    let h = `<path fill="#6c8b5c" d="M-160 900V624H1760V900z"/>`;
    h += water('M610 620h165Q697 734 1180 900H30Q550 740 610 620z', 620, 4501 + v, dusk);
    h += `<path fill="#c2b69a" d="M783 620h30Q899 789 1580 900h-300Q783 763 783 620z"/><path fill="none" stroke="#647258" stroke-width="8" d="M789 637Q820 782 1242 894"/>`;
    for (let i = 0; i < 3; i++) h += tree(1220 + i * 198, 760 + i * 58, .6 + i * .2, v === 2, 4510 + i);
    h += birch(290, 849, 1, v === 2);
    if (v === 0) h += narrowboat(651, 773, .75) + reeds(350, 899, .8, 4518);
    if (v === 1) h += narrowboat(543, 829, 1.25) + `<path fill="none" stroke="#b9ad8d" stroke-width="3" d="M320 843Q626 900 1150 884"/>`;
    if (v === 2) h += bench(1180, 854, 1.05) + narrowboat(675, 674, .32) + reeds(488, 783, .65, 4521);
    if (v === 3) h += narrowboat(632, 762, .82) + duck(628, 868, .8) + reeds(273, 900, 1.1, 4524);
    return h;
  };
  const meadowPark = v => {
    let h = `<path fill="#9bad71" d="M-160 900V631Q850 588 1760 635V900z"/><path fill="#c5bb9d" d="M570 900Q1160 760 821 627h24Q1400 771 838 900z"/>`;
    h += tree(v === 1 ? 1160 : 373, 721, .63, v === 2) + birch(1380, 767, .55, v === 2);
    if (v === 1 || v === 3) h += water('M-160 862Q532 678 831 707Q1076 754 1760 689v43Q1130 802 838 739Q574 707-160 900z', 709, 4551 + v, v === 3) + reeds(372, 836, .78, 4558);
    if (v === 2) h += `<path fill="#9b9671" d="M-160 900V828Q377 713 810 793L1031 900z"/>${bench(573, 802, .7)}`;
    h += meadow(4560 + v, 28, -120, v === 1 ? 330 : 590, 750, 893, v === 2 ? ['#ccb679', '#ddd0aa'] : ['#dccbb0', '#b99abb', '#f0dfae']);
    h += meadow(4570 + v, 15, 1200, 1720, 794, 890, ['#ded6aa', '#b6bd80']);
    if (v === 0) h += dragonfly(950, 670, 1);
    return h;
  };
  const woodland = v => {
    let h = `<path fill="${v === 2 ? '#8a7955' : '#728858'}" d="M-160 610H1760V900H-160z"/><path fill="#c0ac85" d="${v === 1 ? 'M-100 900Q943 711 826 622h22Q1123 773 620 900z' : 'M710 900Q476 763 783 614h41Q679 766 1090 900z'}"/>`;
    for (let i = 0; i < 4; i++) h += birch(130 + i * 137, 690 + i * 49, .54 + i * .17, v === 2) + birch(1020 + i * 193, 690 + i * 52, .45 + i * .2, v === 2);
    h += tree(v === 1 ? 1080 : 235, 900, 1.25, v === 2, 4600);
    h += fern(v===1?460:1210,898,v===1?1.25:1)+fern(v===1?330:1360,879,.7);
    if (v === 0) h += meadow(4611, 25, 50, 650, 797, 900, ['#777eaf', '#9198c3', '#6c7aa3']);
    if (v === 1) h += `<path fill="#6b5941" d="M300 849l315-60 16 50-317 63z"/><path fill="#b59a6c" d="M308 901l-8-52 17-3 9 50z"/>${grass(4618, 25, 190, 650, 900, 110, '#547249')}`;
    if (v === 2) h += meadow(4621, 19, 120, 760, 840, 900, ['#d9a966', '#c08c51', '#aa824e']);
    if (v === 3) h += bench(818, 745, .6) + dragonfly(759, 626, .65);
    return h;
  };
  const hangarFrame = (x, y, k, endOn = false) => {
    let frames = '', rails = '';
    const n = endOn ? 5 : 7;
    for (let i = n - 1; i >= 0; i--) {
      const ox = endOn ? i * 17 : i * 63, oy = -i * 15, half = endOn ? 260 - i * 24 : 220, high = endOn ? 390 - i * 26 : 344;
      frames += `<path d="M${ox - half} ${oy}V${oy - high + 93}L${ox - half + 68} ${oy - high + 26}Q${ox} ${oy - high - 64} ${ox + half - 68} ${oy - high + 26}L${ox + half} ${oy - high + 93}V${oy}"/><path stroke-width="3" d="M${ox - half} ${oy - high + 93}h${half * 2}M${ox - half} ${oy - 10}l68-${high - 20}M${ox + half} ${oy - 10}l-68-${high - 20}M${ox - half + 68} ${oy - high + 26}L${ox + half - 68} ${oy - high + 93}M${ox + half - 68} ${oy - high + 26}L${ox - half + 68} ${oy - high + 93}"/>`;
      if (!endOn && i < n - 1) rails += `<path stroke-width="3" d="M${ox - half} ${oy}l63-190M${ox - half} ${oy - 175}l63 160M${ox + half} ${oy}l63-190M${ox + half} ${oy - 175}l63 160"/>`;
    }
    return `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="${endOn ? 0 : 190}" cy="13" rx="${endOn ? 310 : 520}" ry="26" fill="#4b6153" opacity=".2"/><g fill="none" stroke="#73877f" stroke-width="8" stroke-linejoin="round">${frames}${rails}</g><g fill="none" stroke="#dae0ca" stroke-width="2" opacity=".72">${frames}</g></g>`;
  };
  const hangar = v => {
    let h = `<path fill="#96a77b" d="M-160 620H1760V900H-160z"/><path fill="#c5c0a9" d="M-160 900l420-160h780l720 160z"/><path fill="none" stroke="#e3dac0" stroke-width="4" d="M0 900l504-140M1470 900l-491-140"/>`;
    if (v === 0) h += hangarFrame(590, 746, .94) + tree(1370, 839, .72);
    if (v === 1) h += hangarFrame(790, 842, 1.35, true) + grass(4661, 26, -160, 420, 900, 65, '#617d54');
    if (v === 2) h += hangarFrame(903, 719, .59) + tree(338, 851, .96, true) + bench(699, 866, 1.15) + meadow(4664, 12, 1100, 1710, 841, 900, ['#e4cf9e', '#b78f6a']);
    if (v === 3) h += hangarFrame(605, 783, 1.09) + `<path stroke="#657969" stroke-width="5" d="M390 844v-83M1280 844v-83"/>${lit(384, 752, 12, 17)}${lit(1274, 752, 12, 17)}${bench(1130, 897, .9)}`;
    return h;
  };
  const localAtmosphere = (place,view,index) => {
    const dusk=view===3, autumn=view===2, seed=4800+index*31+view;
    const skies=[['#228ab3','#a6ddd5','#ffebb5'],['#2f8d9d','#c2e3cd','#fff0c7'],['#467ec1','#bfdbef','#f5edc4'],['#167da6','#9ddadf','#edfbdf'],['#428da3','#b5dbca','#ffe6b8'],['#497fb3','#c2dee5','#f7e4a4'],['#408878','#a4c9a2','#eff0bc'],['#346eae','#c0d8eb','#f4dca8']];
    const [top,mid,base]=skies[index],sx=[1180,390,1060,520,1290,270,1100,630][index],sy=[180,285,210,155,265,310,140,240][index];
    const woodland=place==='southwood-woodland',pond=place==='fleet-pond'||place==='wyndhams-pool',heath=place==='yateley-common';
    return {
      sky:dusk?[[0,index%2?'#283a70':'#453269'],[.55,index%2?'#698aaa':'#b176a2'],[.8,index%2?'#dbb7b1':'#f5af83'],[1,'#ffdfab']]:[[0,top],[.6,mid],[1,autumn?'#ffe4ac':base]],
      sun:[view===1?1600-sx:sx,dusk?sy+170:sy,dusk&&pond?24:34],light:woodland?false:dusk&&pond?'moon':'sun',rays:heath||place==='southwood-country-park',birds:false,
      air:()=>woodland?haze(340,210,'#c9efd3',.25):place==='fleet-canal'?streak(620,130,320,dusk?'#e4b6b4':'#ecf9ea',.42,83)+cloud(1320,290,.57,'#c4d8d1',.5,91,12):pond?streak(view===1?1140:350,180,250,'#eaf6eb',.48,79)+cloud(view===1?350:1240,120,.8,'#bedbdc',.75,68,seed%19):cloud(view===1?1220:250,125+index*12,.65+index*.06,dusk?'#b7a6c5':'#b9dbe4',.78,61+index*3,seed%23)+streak(view===1?430:1170,270-index*11,230+index*15,'#f9ecd6',.43,88),
      far:()=>woodline(dusk?'#506088':'#82b8aa',woodland?350:550+index*7,woodland?90:15+index*3,seed,-160,1760,790,woodland?'#a9c585':'#bfdbc0')+haze(woodland?475:560,100,dusk?'#ead0c6':'#eff9d7',.32),
      mid:()=>woodland?woodline('#2b694e',420,90,seed+2,-160,1760,800,'#79a867'):heath?`<path fill="#6a9271" d="M-160 650v-41q322-40 810 4t1110-5v42z"/>`+gorse(290,644,.36):woodline(dusk?'#3c626d':'#3e8267',pond?610:593+index*4,pond?22:38,seed+3,-160,1760,760,'#92bf81'),
      life:()=>{
        if(woodland) return autumn?mv('ukfall',{ad:'12s',d:'-3s',dx:'90px'},'<path fill="#e8ad36" d="M930 444q-23-18-25 8 15 13 25-8z"/>')+mv('ukfall',{ad:'16s',d:'-8s',dx:'-110px'},'<path fill="#ce733f" d="M430 510q-18-14-21 6 12 12 21-6z"/>'):butterfly(890,662,'#eac48e',.35);
        if(heath) return dusk?mv('ukfly',{ad:'7s',d:'-2s'},'<ellipse cx="708" cy="700" rx="5" ry="2" fill="#e9d6c5"/>'):butterfly(view===1?720:970,739,'#eaa443',.45);
        if(place==='fleet-canal') return dragonfly(957,758,.6);
        if(place==='southwood-country-park') return butterfly(view===1?820:1090,741,'#f7d771',.5)+grass(seed,16,510,680,867,69,'#5b9751');
        if(place==='farnborough-airship-hangar') return dusk?mv('ukglow',{ad:'8s'},'<path fill="#efcf8f" opacity=".12" d="M395 777l-90 110h185zM1274 782l-85 105h187z"/>'):birds(seed,2,view===1?330:1200,220,'#33556b',.65,260);
        if(place==='fleet-pond') return reeds(view===1?1280:1440,889,.86,seed)+duck(view===1?1000:703,820,.45);
        if(place==='wyndhams-pool') return fern(1360,900,.9)+mv('ukdrift',{ad:'37s',dx:'54px'},haze(744,74,'#d2ecd8',.17));
        return butterfly(1170,788,'#e0ba64',.35)+grass(seed,20,1150,1430,859,48,'#7ea340');
      },
    };
  };
  /* Yateley redraw: separate full-screen compositions, authored from the
     Common's heather/gorse/birch ecology and the Green's pond/wildflower setting.
     References: hants.gov.uk/thingstodo/countryside/walking/yateleycommon
     yateley-tc.gov.uk/our-services/open-spaces/ . Existing location ids survive. */
  const yateleyScene = (place,v,season) => {
    const {sun,stars,finish,reflect}=T;
    const common=place==='yateley-common',green=place==='yateley-green',evening=v===3,autumn=season==='autumn',winter=season==='winter',spring=season==='spring',summer=season==='summer',close=v===1;
    const seed=6200+(common?0:green?90:45)+v*7+['spring','summer','autumn','winter'].indexOf(season)*211,r=rnd(seed);
    const sky=U(),land=U(),lake=U(),leaf=U(),bloom=U(),rush=U(),bark=U(),rim=U(),rock=U(),shore=U(),soil=U(),heathGlow=U(),forest=U(),shadow=U(),cloudLight=U();
    const top=evening?(winter?'#233450':'#25366c'):winter?'#4d7998':spring?'#268cab':autumn?'#286997':common?'#268fc0':green?'#277fab':'#166c9c';
    const middle=evening?(winter?'#8195b2':'#b26da0'):winter?'#c4d8df':spring?'#b1e9d5':autumn?'#ffc58d':summer?'#b8e4c6':common?'#87dfdb':'#83d3d2';
    const bottom=evening?(winter?'#e4c4b9':'#ffc88d'):winter?'#f1efe2':autumn?'#ffeac1':summer?'#ffe0a0':'#fff1bf';
    const sx=common?(close?405:1190):green?(close?1200:390):(close?1140:510),sy=evening?440:winter?360:autumn?325:spring?240:185;
    let defs=`<defs>${linU(sky,[[0,top],[.57,middle],[1,bottom]],0,0,0,700)}${linU(land,[[0,winter?'#f0f3eb':spring?'#b0d98a':autumn?'#a9b16c':'#98c57d'],[.55,winter?'#c3d4d5':spring?'#659c60':autumn?'#8b9250':'#54894e'],[1,autumn?'#635644':winter?'#a7bcc1':'#173f44']],0,525,0,900)}${linU(lake,[[0,evening?'#d28cab':winter?'#e0eeed':'#94dbca'],[.45,evening?'#657fbc':winter?'#a1c1d1':'#238fb0'],[1,winter?'#789aaf':'#123e68']],0,540,0,900)}${linU(forest,[[0,winter?'#9faba9':spring?'#a1cfa0':autumn?'#d0ae71':'#77b8a1'],[.4,evening?'#55658d':winter?'#627b7d':autumn?'#856e50':'#448878'],[1,'#23515e']],0,350,0,680)}${linU(shadow,[[0,'#172e52',0],[.5,'#172e52',.16],[1,'#172e52',0]],0,650,0,890)}${linU(cloudLight,[[0,'#fff8e8',.55],[1,'#c4e9e3',0]],0,-45,0,70)}${linU(soil,[[0,winter?'#e6e8dc':'#f4e1b9'],[1,winter?'#b1c2c6':'#bba077']],0,560,0,900)}${linU(heathGlow,[[0,winter?'#bcc7c0':spring?'#99b977':autumn?'#b88172':'#de7bbe'],[.6,winter?'#819c9c':spring?'#527b59':autumn?'#8c6b63':'#9b4f97'],[1,'#304b53']],0,790,0,950)}${linU(bark,[[0,'#faf1d7'],[.45,'#d9e5d8'],[1,'#7c9890']],-17,0,20,0)}${linU(rock,[[0,winter?'#f1f4e9':'#e4d0ad'],[1,winter?'#abc0c1':'#718b84']],0,0,0,70)}
      <g id="${leaf}"><path d="M0 0q-15-21-6-31l5 4 4-5 5 9 7 1-1 9 5 4-9 9z"/><path fill="none" stroke="#e1e5b1" stroke-width="1" opacity=".5" d="M0 0l3-25"/></g>
      <g id="${bloom}"><path fill="none" stroke="#42594d" stroke-width="1.5" d="M0 0l1-60M0-5l-24-35M0-15l-16-39M0-15l18-37M0-5l25-28M1-32l-7-26M0-34l10-23"/><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 4" d="M1-60v41M-24-40l18 27M-16-54l11 25M18-52l-12 28M25-33L10-16M-6-58l5 17M10-57L4-41"/><path fill="none" stroke="#f9d8e3" opacity=".48" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="1 6" d="M-20-37l14 21M15-47L7-28M0-55v24"/></g>
      <g id="${rush}"><path fill="none" stroke="${winter?'#a3b5a0':autumn?'#a18b5b':'#739943'}" stroke-width="3" d="M0 0q-20-48-9-117M0 0q25-65 18-96M0 0q-34-41-40-66M0 0q29-31 47-45"/><path stroke="#ab703e" stroke-width="8" stroke-linecap="round" d="M-9-116v-26M18-96v-23"/></g></defs>`;
    if(!summer) {
      const flower=common||winter||autumn
        ? `<path fill="none" stroke="${winter?'#d2dac7':spring?'#86ac69':'#b48c75'}" stroke-width="2" stroke-linecap="round" d="M0-4l1-52M0-8l-19-24M0-18l16-23M0-27l-8-25M0-28l10-20"/><path fill="none" stroke="${winter?'#eef3e7':spring?'#b6cf7a':'#d7ae91'}" stroke-width="3" stroke-dasharray="1 5" d="M1-51v32M-18-31l11 15M16-40l-9 15"/>`
        : '<path stroke="#659064" stroke-width="2" fill="none" d="M0 0v-42M0-8l-16-18M0-14l16-21"/><path fill="#fbf2d0" d="M-1-41q-14-15-18-5-3 9 18 5-11 12-2 15 10 2 2-15 12 11 17 2 3-9-17-2 12-13 4-18-9-4-4 18z"/><circle cy="-41" r="4" fill="#e9bd51"/><circle cx="-16" cy="-26" r="5" fill="#fff7cf"/><circle cx="16" cy="-35" r="6" fill="#e5c65f"/>';
      const begin=defs.indexOf(`<g id="${bloom}">`),end=defs.indexOf('</g>',begin)+4;
      defs=defs.slice(0,begin)+`<g id="${bloom}">${flower}</g>`+defs.slice(end);
    }
    const foliage=(x,y,k,which) => {
      const q=rnd(which),a=autumn?'#d49942':spring?'#91c965':'#63a461',b=autumn?'#f5c565':spring?'#d7e89a':'#c1d886';let leaves='',twigs='';
      // Slender, divided birch branches and individually painted leaf clusters.
      for(let j=0;j<5;j++){const yy=-175-j*67,side=j%2?1:-1,reach=70+q()*90;twigs+=`M0 ${yy+24}q${side*reach*.4}-${36} ${side*reach}-${75}m${-side*reach*.25} 23l${side*26}-${45}`;
        for(let i=0;i<(winter?0:spring?4:autumn?4:6);i++){const xx=side*(22+q()*reach),ly=yy-18-q()*90;leaves+=`<use href="#${leaf}" fill="${i%3?a:b}" transform="translate(${R(xx)} ${R(ly)}) rotate(${R(-75+q()*150)}) scale(${((spring?.45:.65)+q()*(spring?.45:.7)).toFixed(2)})"/>`;}}
      if(spring)for(let i=0;i<6;i++)leaves+=`<path fill="none" stroke="#d6c786" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 3" d="M${i%2?45:-60} ${-225-i*40}q9 18 4 29"/>`;
      if(winter)twigs+='M-110-380l-27-19M65-420l38-18M-90-240l-42-12';
      return `<g transform="translate(${x} ${y}) scale(${k})"><ellipse rx="81" ry="15" fill="#0c343a" opacity=".23"/><path fill="url(#${bark})" d="M-18 0q22-199 4-538l12-18Q7-300 24 0z"/><path fill="none" stroke="#537872" stroke-width="3" d="M-12-46h15M-8-97h12M-5-155h17M-8-222h12M-8-301h9M-10-377h8M-12-446h8"/>${mv('ukybranch',{ad:`${5+which%4}s`,d:`-${which%3}s`,to:'0px -160px'},`<path fill="none" stroke="#829f83" stroke-width="4" d="${twigs}"/>${leaves}`)}</g>`;
    };
    const flowers=(which,n,x0,x1,y0,y1) => {
      const q=rnd(which);let groups=['','',''];
      for(let i=0;i<n;i++){const x=R(x0+q()*(x1-x0)),y=R(y0+q()*(y1-y0)),k=.38+(y-y0)/(y1-y0+1)*.85;groups[i%3]+=`<use href="#${bloom}" transform="translate(${x} ${y}) scale(${k.toFixed(2)})"/>`;}
      return groups.map((d,i)=>mv('ukygrass',{ad:`${3.8+i*.7}s`,d:`-${i*.8}s`,to:'800px 900px'},`<g style="color:${winter?['#c7d9cc','#cbd4b8','#e3e4cd'][i]:spring?['#9bcf78','#f4e3a6','#d5e1a0'][i]:autumn?['#cf8b62','#e9ba69','#d4828c'][i]:['#dc67c0','#ac64ba','#eea0d0'][i]}">${d}</g>`)).join('');
    };
    const flutter=(x,y,k,col,which) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukywander',{ad:`${7+which%4}s`,d:`-${which%5}s`,dx:`${which%2?90:-110}px`,dy:'-48px'},mv('ukywing',{ad:'.42s',to:'0px 0px'},`<path fill="${col}" stroke="#243f58" stroke-width="2" d="M0 0C-33-35-42-15-24 3Q-34 28-6 15L0 0C33-35 42-15 24 3Q34 28 6 15z"/><path fill="none" stroke="#f0ecda" stroke-width="2" stroke-dasharray="2 4" d="M-5-2q-20-22-23-7M5-2q20-22 23-7"/><path stroke="#203c48" stroke-width="3" d="M0-9V18M0-7l-5-7M0-7l5-7"/>`))}</g>`;
    const dart=(x,y,k,which) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukydart',{ad:`${6+which%3}s`,d:`-${which%4}s`,dx:'130px',dy:'-48px'},`<g>${mv('ukywing',{ad:'.12s',to:'0px 0px'},'<path fill="#dafff4" opacity=".65" stroke="#81bac7" stroke-width="1" d="M0 0q-56-39-59-17 15 20 59 17-61 11-48 28 27 1 48-28 56-39 59-17-15 20-59 17 61 11 48 28-27 1-48-28z"/>')}<path stroke="#209aa7" stroke-width="5" stroke-linecap="round" d="M0-7v48"/><path stroke="#214865" stroke-width="2" stroke-dasharray="2 4" d="M0 5v38"/><circle cy="-10" r="6" fill="#2e6c77"/></g>`)}</g>`;
    const swimmer=(x,y,k,which,young=false) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukypaddle',{ad:`${14+which%5}s`,d:`-${which%7}s`,dx:which%2?'85px':'-70px',dy:'3px'},`<ellipse cx="-3" cy="18" rx="52" ry="9" fill="#0a4664" opacity=".23"/>${mv('ukyripple',{ad:'3.6s',d:`-${which%3}s`,to:'0px 18px'},'<path fill="none" stroke="#c9fff1" stroke-width="2" opacity=".7" d="M-65 20q60 16 129-2M-91 31q75 14 173-4"/>')}<path fill="${young?'#dcbd71':'#c8c8aa'}" d="M-40 0q-15-32 24-33 46-4 59 29L24 14H-19z"/><path fill="${young?'#886a44':'#376f5a'}" d="M20-6q-23-37-2-48 26-12 27 12l-7 38z"/><path fill="#eeb35b" d="M41-42l22 7-24 5z"/><circle cx="33" cy="-44" r="2.5" fill="#152d39"/><path fill="${young?'#ae8755':'#839983'}" d="M-28-16q32-24 48 3-20 17-48-3z"/><path fill="none" stroke="#ebe7c6" stroke-width="3" d="M15-19l17-4"/>`)}</g>`;
    const pollen=(which) => {const q=rnd(which);let bits='';for(let i=0;i<8;i++){const x=R(210+q()*1170),y=R(430+q()*370);bits+=mv('ukypollen',{ad:`${8+i%4}s`,d:`-${i*.8}s`,dx:`${60+i*9}px`,dy:autumn?'140px':spring&&green?'95px':'-75px'},autumn?`<use href="#${leaf}" fill="${i%2?'#dc9b43':'#d26b53'}" transform="translate(${x} ${y}) rotate(${i*31}) scale(.35)"/>`:spring&&green?`<ellipse cx="${x}" cy="${y}" rx="4" ry="2" fill="#ffdce7" transform="rotate(${i*25} ${x} ${y})"/>`:`<circle cx="${x}" cy="${y}" r="${1.3+q()*1.8}" fill="#fff3d0" opacity=".6"/>`);}return bits;};
    const leafLitter=(which,x0,x1,y0,y1,n=22)=>{const q=rnd(which);let bits='';for(let i=0;i<n;i++)bits+=`<use href="#${leaf}" fill="${['#8c633e','#b27b44','#d69c53'][i%3]}" transform="translate(${R(x0+q()*(x1-x0))} ${R(y0+q()*(y1-y0))}) rotate(${R(q()*360)}) scale(.25 .15)"/>`;return bits;};
    const seasonalGorse=(x,y,k)=>winter?`<g transform="translate(${x} ${y}) scale(${k})"><path fill="#647d68" d="M-85 0q-20-59 35-60-6-74 57-74 55 10 44 77 55-15 56 57z"/><path fill="#eaf0e7" d="M-50-66q-2-65 57-68 50 7 46 53l-37-14-36 4zM-80-38q10-24 36-22l21 7-48 17z"/><path fill="none" stroke="#6c715e" stroke-width="2" d="M-17 0v-69m0 22l-22-19M25 0l8-44 15-9"/></g>`:gorse(x,y,k);
    const horizonY=common?480:green?435:405;
    const bough = (flip=false) => {
      const q=rnd(seed+49);let leaves='';for(let i=0;i<(winter?0:spring?15:autumn?17:25);i++){const x=R(20+q()*660),y=R(18+q()*215),k=(spring?.6:.9)+q()*(spring?.7:1.1);leaves+=`<use href="#${leaf}" fill="${autumn?(i%3?'#d99040':'#f3bc61'):(i%3?'#286f59':'#a8cc77')}" transform="translate(${x} ${y}) rotate(${R(-60+q()*160)}) scale(${k.toFixed(2)})"/>`;}
      return `<g${flip?' transform="translate(1600 0) scale(-1 1)"':''}>${mv('ukybranch',{ad:'7.6s',to:'0px 60px'},`<path fill="none" stroke="#655b44" stroke-width="17" d="M-160 24Q192 144 647 176"/><path fill="none" stroke="#7d7952" stroke-width="4" d="M68 90l109-63M260 138l105-59M379 155l68 102M496 169l104-36"/>${leaves}`)}</g>`;
    };
    let out=`<g data-uk-season="${season}"${evening?' class="hx-evening"':''}>${defs}<rect width="1600" height="900" fill="url(#${sky})"/>${stars(seed,24,310)}`;
    out+=evening&&!common?`<path fill="#f8efc9" d="M${sx} 250a34 34 0 1 0 27 52 29 29 0 0 1-27-52z"/>`:sun(sx,sy,evening?44:39,'#fff5c9','#ffd493');
    // Long, broken cloud veils with lit edges; each site has its own sky layout.
    const veil=(x,y,k,delay) => mv('ukdrift',{ad:'71s',d:`-${delay}s`,dx:'90px'},`<g transform="translate(${x} ${y}) scale(${k})"><path fill="url(#${cloudLight})" d="M-300 30Q-227-4-181 14q44-67 101-36 61-44 110-14 82-23 127 13 80-12 128 34 34-8 77 23Q61 75-300 30z"/><path fill="none" stroke="#fff8e6" opacity=".3" stroke-width="3" d="M-218 16q45-21 82-8M21-9q47-9 81 10M180 17q48 1 75 18"/></g>`);
    out+=common?veil(close?1170:340,100,.9,11)+veil(1130,235,.5,23):green?veil(1050,125,.7,9)+veil(245,240,.45,18):veil(350,115,.75,5)+veil(1230,235,.65,21);
    const woodland=(fill,y,amp,which,x0=-160,x1=1760,foot=700,rimColour=fill) => {
      const q=rnd(which);
      if(winter){let twigs='';for(let x=x0;x<x1;x+=R(65+q()*55)){const h=R(65+q()*amp*2),yy=y+95,lean=R((q()-.5)*26),w=R(34+q()*38);
          twigs+=`M${x} ${yy}q${lean} -${R(h*.55)} ${R(lean*.6)} -${h}M${x+R(lean*.35)} ${yy-R(h*.34)}q-${R(w*.65)}-${R(h*.23)} -${w}-${R(h*.51)}q-12 3-17 17M${x+R(lean*.4)} ${yy-R(h*.51)}q${R(w*.7)}-${R(h*.25)} ${w}-${R(h*.42)}q15 3 18 14M${x+R(lean*.5)} ${yy-R(h*.73)}l-15-${R(h*.24)}m15 12l17-16`;
        }
        return `<path fill="${fill}" opacity=".45" d="M${x0} ${y+43}Q700 ${y+78} ${x1} ${y+43}V${foot}H${x0}z"/><path fill="none" stroke="#61777b" stroke-width="2.5" opacity=".65" stroke-linecap="round" d="${twigs}"/><path fill="none" stroke="#eef2e5" stroke-width="8" d="M${x0} ${y+80}Q700 ${y+64} ${x1} ${y+86}"/>`;}
      let edge=`M${x0} ${foot}V${y}`,glints='',trunks='';
      for(let x=x0;x<x1;){const w=R(65+q()*80),h=R(15+q()*amp*1.6),yy=R(y+q()*22);
        edge+=`l${R(w*.12)}-${R(h*.34)}q-${R(w*.12)}-${R(h*.4)} ${R(w*.21)}-${R(h*.44)}l${R(w*.15)}-${R(h*.3)}q${R(w*.24)}-${R(h*.11)} ${R(w*.24)} ${R(h*.38)}q${R(w*.28)}-${R(h*.08)} ${R(w*.28)} ${R(h*.44)}L${x+w} ${yy}`;
        if(q()>.45)glints+=`M${R(x+w*.28)} ${yy-h+5}l${R(w*.18)}-${R(h*.18)} ${R(w*.2)} ${R(h*.1)}`;
        if(h>48)trunks+=`M${R(x+w*.48)} ${y+95}v-${R(h+64)}m0 31l-13-18`;
        x+=w;
      }
      return `<path fill="${fill}" d="${edge}V${foot}H${x0}z"/><path fill="none" stroke="${rimColour}" stroke-width="3" opacity=".32" d="${glints}"/><path fill="none" stroke="#264c50" stroke-width="2" opacity=".24" d="${trunks}"/>`;
    };
    out+=mv('ukpar',{ad:'49s',dx:'7px'},woodland(evening?'#687ba4':winter?'#a4b8be':'#85b8b2',horizonY,32,seed+1,-160,1760,680,'#d0e6c4')+haze(horizonY-65,130,evening?'#ffcebc':'#e7ffc9',.32));
    let canopyLight='';for(let i=0;i<(winter?0:36);i++){const x=R(-140+r()*1880),y=R(horizonY+40+r()*46);canopyLight+=`M${x} ${y}q12-10 25-3t24 4`;}
    const trees=woodland(`url(#${forest})`,horizonY+65,common?34:70,seed+2,-160,1760,700,autumn?'#efbd61':'#8fcc91')+`<path fill="none" stroke="${autumn?'#d5c78a':'#abd0ab'}" stroke-width="4" opacity=".25" stroke-linecap="round" d="${canopyLight}"/>`;
    out+=`<rect x="-160" y="550" width="1920" height="350" fill="url(#${land})"/>`;
    out+=mv('ukpar',{ad:'38s',dx:'15px'},`<g id="${shore}">${trees}</g>`);
    if(common){
      const trail=close?'M430 900C1010 770 555 665 945 580l22 4C743 693 1290 787 690 900z':'M657 900C318 745 966 724 846 572l20 3C1031 746 581 777 987 900z';
      out+=mv('ukpar',{ad:'31s',dx:'23px'},`<path fill="${winter?'#e4eadf':spring?'#98bc73':autumn?'#b3a272':'#899f61'}" d="M-160 900V642Q300 580 850 620T1760 608V900z"/><path fill="url(#${soil})" d="${trail}"/><defs><clipPath id="${rim}"><path d="${trail}"/></clipPath></defs><g clip-path="url(#${rim})"><path stroke="#af966c" stroke-width="2" opacity=".5" d="${Array.from({length:26},()=>`M${R(400+r()*650)} ${R(650+r()*250)}h${R(2+r()*5)}`).join('')}"/></g><path fill="none" stroke="#fcdfb2" opacity=".6" stroke-width="5" d="M760 855Q629 774 865 646"/>${mv('ukdrift',{ad:'54s',dx:'130px'},`<path fill="url(#${shadow})" d="M-160 749q400-116 908-27t1012-63v139q-530 34-959-5T-160 842z"/>`)}${seasonalGorse(close?1170:410,730,.85)}${seasonalGorse(close?300:1260,770,.66)}${foliage(close?1300:1180,742,.54,seed+4)}${flowers(seed+8,23,-100,580,686,851)}${flowers(seed+9,24,1020,1740,657,856)}`);
      out+=mv('ukpar',{ad:'24s',dx:'34px'},`<path fill="${winter?'#e7eee2':autumn?'#665846':'#215b4e'}" d="M-160 900V870Q280 817 530 900zM1060 900q302-104 700-65v65z"/><path fill="url(#${heathGlow})" d="M-160 900V876q108-35 203-12 94-48 184-7 112-27 238 45zM1120 900q60-38 158-22 111-40 209-2 119-25 273 30v32z"/><path fill="none" stroke="${winter?'#edf3e5':spring?'#c4d69f':autumn?'#d7b57f':'#efb7d7'}" stroke-width="3" opacity=".5" d="M-160 882q122-40 219-4M1310 872q159-37 289 8"/>${flowers(seed+11,19,-130,540,880,965)}${flowers(seed+12,20,1070,1720,875,953)}${close?foliage(164,941,1.08,seed+15):`<path fill="url(#${rock})" d="M140 900l31-59 54-11 56 26 13 44z"/><path fill="#627f65" d="M158 900l16-41 65-11 31 33z"/>`}${grass(seed+13,24,80,530,911,95,winter?'#e3e9d0':autumn?'#b59d65':'#91b86b')}${v===2?'<path fill="#8b704e" d="M160 904l335-90 40 18-25 24-305 72z"/><path fill="none" stroke="#d4b587" stroke-width="5" d="M182 900l312-73 20 5"/><path fill="#688268" d="M205 900l57-43 35 21-9 22z"/>':''}`);
      out+=`<g transform="translate(${close?872:862} 647) scale(.48)">${mv('ukywalk',{ad:'19s',dx:'48px',dy:'16px'},`<ellipse cy="2" rx="29" ry="5" fill="#263f43" opacity=".2"/><circle cy="-78" r="9" fill="#b98d6d"/><path fill="#bc704f" d="M-11-67h22l7 34h-36z"/><path fill="#496b73" d="M9-60l8 2 9 29-10 3z"/>${mv('ukyleg',{ad:'.9s',to:'-6px -33px'},'<path stroke="#364c57" stroke-width="7" stroke-linecap="round" d="M-6-33l-7 31"/>')}${mv('ukyleg',{ad:'.9s',d:'-.45s',to:'6px -33px'},'<path stroke="#364c57" stroke-width="7" stroke-linecap="round" d="M6-33l7 31"/>')}<path stroke="#b98d6d" stroke-width="5" d="M-10-55l-6 21"/><path fill="none" stroke="#70594d" stroke-width="2" d="M-16-34q-16 27-42 20"/><path fill="#aa8b62" d="M-82-13q19-12 40-3l8 12-13 4-1 9h-5v-12h-18l-4 12h-5v-15l-9-5z"/><path fill="#665b4b" d="M-43-17l8-7 8 11-9 5z"/>`)}</g>`;
      out+=(summer?flutter(close?760:470,close?683:773,.56,'#65b8ea',seed)+flutter(1150,715,.34,'#ac87d1',seed+1):spring?flutter(650,735,.37,'#f1d6a1',seed):'')+(winter?'':pollen(seed+20));
      if(evening&&summer)out+=mv('ukybranch',{ad:'3.4s',to:'1170px 690px'},'<path fill="#394552" d="M1140 686q19-24 42-9l12 13-32 6-18-4-19 5z"/><path fill="#ab9372" d="M1149 683l28-2-12 10z"/>');
    }else{
      const pondShape=green?'M310 900Q132 735 408 623Q665 566 1101 613Q1360 639 1530 900z':'M-160 605Q480 550 1760 608V900H-160z';
      out+=`<defs><clipPath id="${rim}"><path d="${pondShape}"/></clipPath></defs><g clip-path="url(#${rim})"><path fill="url(#${lake})" d="${pondShape}"/>${reflect(shore,600,winter?.1:.23)}${shimmer(seed+23,winter?6:22,-160,1760,625,890,evening?'#ffd9bc':'#cffff0',60)}${winter?'':mv('ukyripple',{ad:'6.3s',to:'990px 762px'},'<ellipse cx="990" cy="762" rx="93" ry="12" fill="none" stroke="#c0f1dc" stroke-width="2" opacity=".6"/>')}<path fill="none" stroke="#c5f1d0" stroke-width="3" opacity=".5" d="M-160 613Q490 563 1760 615"/></g>`;
      if(winter)out+=`<g clip-path="url(#${rim})"><path fill="none" stroke="#f1f7f1" stroke-width="3" opacity=".65" d="M230 770l146-31 81 14 116-54 71 12M375 739l-30-40-83-6M573 699l27-61M1120 837l-87-41 20-29-64-34M1033 796l-90 21-106-19"/><path fill="#d6e8e7" opacity=".45" d="M-160 805l283-64 114 36 266-26-163 73-268-13-232 55z"/></g>`;
      let plants='';for(let i=0;i<12;i++){const x=R((i<6?60:1180)+r()*300),y=R(875+r()*65);plants+=`<use href="#${rush}" transform="translate(${x} ${y}) scale(${(.6+r()*.75).toFixed(2)})"/>`;}
      const bank=`<path fill="${winter?'#e8eee0':'#346f58'}" d="M-160 900V792Q83 693 433 839L550 900zM1150 900Q1390 753 1760 778V900z"/><path fill="${winter?'#f4f5e8':'#7aaa67'}" d="M-160 806q274-92 563 45l-21 14q-269-130-542-41z"/>`;
      out+=mv('ukpar',{ad:'27s',dx:'26px'},bank+mv('ukygrass',{ad:'4.2s',to:'800px 900px'},plants)+flowers(seed+26,14,1190,1720,840,943));
      out+=green?mv('ukpar',{ad:'32s',dx:'16px'},foliage(close?1290:260,848,close?1.2:.97,seed+28)+bench(1150,685,.7)):
        mv('ukpar',{ad:'29s',dx:'22px'},foliage(close?1370:180,918,close?1.3:1.12,seed+28)+`<path fill="#d1bd93" d="M-160 900l287-112 36 18-174 94z"/>${winter?grass(seed+29,15,1200,1500,939,85,'#cad1b9'):fern(close?370:1360,929,1.25)}`);
      out+=bough(close)+`<path fill="url(#${rock})" d="M-160 900v-36l87-46 52 24 81 14 63 44zM1390 900l47-41 68-15 83 47 172-42v51z"/><path fill="none" stroke="#d8d6b0" stroke-width="3" d="M-113 883l47-46 39 20M1448 870l54-10 62 40"/>`;
      out+=winter?`<g transform="translate(1030 802) scale(.65)">${mv('ukynod',{ad:'5.2s',to:'0px -15px'},'<path fill="#c7c5ad" d="M-43 0q-12-32 28-35 36 0 51 24L24 12H-18z"/><path fill="#3e715b" d="M21-10q-21-34 0-46 24-5 25 14L34 1z"/><path fill="#e6ae55" d="M43-41l19 6-22 5z"/><circle cx="33" cy="-43" r="2" fill="#203039"/>')}<path fill="none" stroke="#c49a64" stroke-width="3" d="M-7 11l-5 13h13M16 10l-2 14h11"/><ellipse cy="28" rx="52" ry="6" fill="#7192a4" opacity=".25"/></g>`:swimmer(close?780:960,green?775:719,close?.88:.65,seed+30)+swimmer(close?975:1120,green?829:785,.48,seed+31)+((spring||summer)?swimmer(1090,green?846:808,.29,seed+32,true)+swimmer(1040,green?863:825,.25,seed+33,true):'');
      out+=(summer?dart(close?609:1260,close?748:787,close?.7:.43,seed+34)+dart(470,715,.35,seed+35)+flutter(green?1170:720,green?611:667,.35,'#f3bf66',seed+36):spring?flutter(720,667,.35,'#f1d6a1',seed+36):'')+(winter?'':pollen(seed+37));
      // Small pads are simple local pond detail; their reflections rock gently.
      let pads='';for(let i=0;i<(winter?0:autumn?3:8);i++){const x=R(445+r()*280),y=R(790+r()*85);pads+=`<path fill="#4c997b" stroke="#91d6aa" stroke-width="1" d="M${x} ${y}m-19 0a19 7 0 1 0 38 0 19 7 0 1 0-38 0l19 2-5-6z"/>`;}
      out+=mv('ukypaddle',{ad:'11s',dx:'9px',dy:'2px'},pads);
    }
    if(winter){
      out+=mv('ukpar',{ad:'24s',dx:'34px'},`<path fill="none" stroke="#edf3df" opacity=".8" stroke-width="5" d="M-160 873q134-38 284-10M1270 871q172-34 490 9"/><path fill="#e0eadd" opacity=".6" d="M-160 900v-22l232-11 90 33zM1470 900l74-23 216-7v30z"/>`);
      if(!common)out+=`<g clip-path="url(#${rim})"><path fill="#d9ebec" opacity=".5" d="M-160 619Q540 572 1760 623l-8 17Q590 589-160 633z"/><path stroke="#e6f3ef" stroke-width="2" opacity=".7" fill="none" d="M-160 625Q570 582 1760 627"/></g>`;
      // A resident robin supplies object motion when summer insects are absent.
      out+=`<g transform="translate(${common?1284:350} ${common?765:834}) scale(.7)">${mv('ukynod',{ad:'4.6s',to:'0px 0px'},'<path fill="#886b52" d="M-24 0q-12-22 8-30 32-8 38 19L9 10-14 8-40 15z"/><path fill="#df754b" d="M3-27q25 6 13 30Q-5 1 3-27z"/><path fill="#e3d6b5" d="M-7 4l23-5-8 10-17-1z"/><path fill="#d5b878" d="M21-18l12 5-13 3z"/><circle cx="17" cy="-20" r="2" fill="#202f37"/>')}<path stroke="#645749" stroke-width="2" d="M-4 8v11M8 7v12"/></g>`;
      for(let layer=0;layer<3;layer++){const q=rnd(seed+70+layer);let flakes='';for(let i=0;i<18;i++)flakes+=`<circle cx="${R(-160+q()*1920)}" cy="${R(-160+q()*1160)}" r="${(1+layer+q()*1.5).toFixed(1)}" fill="#f8f9ed" opacity="${.35+layer*.2}"/>`;out+=mv('ukysnow',{ad:`${19-layer*4}s`,d:`-${layer*3}s`,dx:`${25+layer*19}px`,dy:`${90+layer*50}px`},flakes);}

      out+=mv('ukdrift',{ad:'44s',dx:'80px'},haze(710,95,'#ebf4ef',.13));
    }
    if(autumn)out+=leafLitter(seed+75,30,470,828,910)+leafLitter(seed+76,1240,1700,832,910);
    if(spring&&green){
      const q=rnd(seed+80),flowerId=U();let blossoms='';
      const petals=Array.from({length:5},(_,i)=>`<ellipse cy="-14" rx="8" ry="13" transform="rotate(${i*72})"/>`).join('');
      out+=`<defs><g id="${flowerId}">${petals}<circle r="4" fill="#e7b56b"/><path stroke="#b78853" stroke-width="1" d="M0-4v8M-4 0h8"/></g></defs>`;
      for(let i=0;i<20;i++){const x=R(40+q()*480),y=R(50+q()*140),k=(.6+q()*.7).toFixed(2);blossoms+=`<use href="#${flowerId}" fill="${i%3?'#ffe6e7':'#f8bacf'}" transform="translate(${x} ${y}) rotate(${R(q()*70)}) scale(${k})"/>`;}
      out+=mv('ukybranch',{ad:'6.8s',to:'0px 95px'},`<path stroke="#81694f" stroke-width="9" fill="none" d="M-160 85Q200 148 520 108M120 112l108-66M350 125l65 56"/>${blossoms}`);
    }
    return out+finish()+'</g>';
  };

  const places = [
    ['yateley-common', 'Yateley Common', 'Yateley', 'landscape', ['heathland', 'heather', 'birch'], heath,
      ['Heather beside the sandy trail', 'Birches above a winding heath path', 'Autumn gorse and a fallen branch', 'A dusk perch above the open heath']],
    ['wyndhams-pool', "Wyndham's Pool", 'Yateley', 'landscape', ['pond', 'woodland', 'reeds'], v => pond('wyndham', v),
      ['A wooded shoreline and open water', 'Dragonflies above the near reeds', 'Autumn birches beside the water', 'Evening water from the wooded bank']],
    ['yateley-green', 'Yateley Green', 'Yateley', 'landscape', ['village green', 'pond', 'wildflowers'], v => pond('green', v),
      ['The pond within the open green', 'A low view across the pond margin', 'Autumn shade beside the green', 'Evening beneath the pondside birches']],
    ['fleet-pond', 'Fleet Pond', 'Fleet', 'landscape', ['lake', 'reedbed', 'nature reserve'], v => pond('fleet', v),
      ['Open water from a viewing platform', 'Reedbed and hovering dragonflies', 'The autumn woodland shore', 'Waterbirds across the evening lake']],
    ['fleet-canal', 'Basingstoke Canal', 'Fleet', 'heritage', ['canal', 'towpath', 'narrowboat'], canal,
      ['A narrowboat below the tree line', 'Close alongside a passing narrowboat', 'Autumn on the wooded towpath', 'Lit cabin windows at dusk']],
    ['southwood-country-park', 'Southwood Country Park', 'Farnborough', 'landscape', ['meadow', 'cove brook', 'wetland'], meadowPark,
      ['Wildflowers across the open meadow', 'Reed margins beside Cove Brook', 'An autumn seat along the meadow trail', 'Evening light over the wetland']],
    ['southwood-woodland', 'Southwood Woodland', 'Farnborough', 'landscape', ['birch', 'oak', 'bluebells'], woodland,
      ['Bluebells along the birch path', 'A fallen branch beneath a mature oak', 'Golden leaves on the woodland floor', 'A quiet clearing in evening light']],
    ['farnborough-airship-hangar', 'Portable Airship Hangar', 'Farnborough', 'heritage', ['aviation', 'steel frame', 'heritage'], hangar,
      ['The restored frame across the lawn', 'Looking through the open steel portals', 'Autumn trees frame the historic structure', 'The braced frame against the evening sky']],
  ];
  // Four composed views per season. Preserve the twelve saved Yateley refs;
  // their former wide/close/evening art is summer and their third view is autumn.
  const seasonalReasons = {
    spring: [['Fresh heath shoots and flowering gorse','Birch catkins above the sandy path','New growth beside the fallen branch','Spring dusk across the heath'],['New birch leaves above the spring pool','Spring waterbirds beside the reeds','Catkins over the woodland margin','Spring evening at the wooded pool'],['Spring blossom around the green pond','Spring flowers along the pond margin','Fresh birches beside the open green','Spring dusk beneath the birches']],
    summer: [['Flowering heather beside the sandy trail','Butterflies beneath the leafy birches','Summer heather around the fallen branch','A summer dusk perch over the heath'],['Leafy shade and open summer water','Dragonflies above the near reeds','Summer waterbirds at the woodland margin','Warm evening water beneath the trees'],['The pond within the summer green','Summer insects across the pond margin','Leafy shade beside the open green','A summer evening beneath the birches']],
    autumn: [['Golden birches and dry heath seed heads','Falling leaves above the winding path','Autumn gorse beside the fallen branch','Amber dusk over the open heath'],['Golden birches above the wooded pool','Falling leaves beside the near reeds','Autumn birches along the water','Autumn evening at the wooded bank'],['Golden leaves around the green pond','Autumn reeds along the water margin','Autumn shade beside the open green','Autumn dusk beneath the birches']],
    winter: [['Frosted heath and a winter robin','Bare birches above the pale sandy path','Snow over the heath and fallen branch','Winter dusk over the frosted heath'],['Bare birches above winter water','A robin beside the frost-lined reeds','Snow over the frozen woodland pool','Winter evening at the misty pool'],['Bare birches around the green pond','Frosted reeds and winter waterbirds','Snow around the frozen green pond','Winter dusk beneath the bare branches']],
  };
  for (let view = 0; view < 4; view++) for (let index = 0; index < places.length; index++) {
    const [place, label, town, kind, tags, draw, reasons] = places[index];
    const originalSeason=view===2?'autumn':'summer';
    const seasons=index<3?['spring','summer','autumn','winter']:[null];
    for(const season of seasons){
      const reason=season?seasonalReasons[season][index][view]:reasons[view];
      add('hampshire', kind, { id: `${place}-${view + 1}${season&&season!==originalSeason?'-'+season:''}`, label, site: `${label} \u2014 ${reason}`,
        colour: season==='winter'?'blue':season==='autumn'?'amber':kind === 'heritage' ? 'slate' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags:season?tags.concat(season):tags,
        ukPlace: place, ukLocality: town, ukTown: town, ukView: (season?['wide','close','detail','evening']:['wide','close','autumn','evening'])[view], viewReason: reason,
        ...(season?{ukSeason:season,season:[season]}:{}),
        svg: () => index < 3 ? yateleyScene(place,view,season) : vista(4700 + index * 17 + view, () => draw(view), { path: false, flat: true, edgeNear: true, y: 610, autumn: view === 2, time: view === 3 ? 'dusk' : 'day', atmosphere:localAtmosphere(place,view,index) }) });
    }
  }
}
