// UK_SCENE_PART: uk-south-east/north-hampshire
/* North Hampshire: Southwood and Farnborough, four composed views each (12 scenes).
   Yateley Common, Wyndham's Pool, Yateley Green, Fleet Pond and the Basingstoke
   Canal at Fleet moved to their own part files (72-anim-pack-uk-south-east-<place>.js),
   one per place, drawn with the rich nature kit (71-anim-uk-nature-kit.js).
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
  const gorse = (x,y,k) => `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#497047" d="M-85 0q-20-59 35-60-6-74 57-74 55 10 44 77 55-15 56 57z"/><path fill="none" stroke="#efc82e" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 21" d="M-64-20q-13-52 34-32M-20-58q-18-66 30-52M36-44q13-36 47-14M-24-19q39-40 64 2"/></g>`;
  const fern = (x,y,k) => {
    let fronds='';for(let i=0;i<8;i++){const yy=-15-i*11,w=43-i*4;fronds+=`M0 ${yy}q-${w} -27-${w+10} -9q${w*.5} 9 ${w+10} 9M0 ${yy}q${w} -27 ${w+10} -9q-${w*.5} 9-${w+10} 9`;}
    return `<g transform="translate(${x} ${y}) scale(${k})">${mv('uksway',{ad:'6.7s',to:'0px 0px'},`<path fill="#4a9b51" d="${fronds}"/><path fill="none" stroke="#aac35b" stroke-width="2" d="M0 0q-7-65 4-111"/>`)}</g>`;
  };
  const butterfly = (x,y,col,k=1) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukflutter',{ad:'9s',d:'-3s'},mv('ukflap',{ad:'.65s'},`<path fill="${col}" d="M0 0q-38-45-38-10 0 22 38 18 34-43 38-16 2 29-38 16z"/><path fill="#503943" d="M-2-9h4v26h-4z"/>`))}</g>`;
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
  // [old index (keeps the seeds and sky), id, label, town, kind, tags, draw, reasons]
  const places = [
    [5, 'southwood-country-park', 'Southwood Country Park', 'Farnborough', 'landscape', ['meadow', 'cove brook', 'wetland'], meadowPark,
      ['Wildflowers across the open meadow', 'Reed margins beside Cove Brook', 'An autumn seat along the meadow trail', 'Evening light over the wetland']],
    [6, 'southwood-woodland', 'Southwood Woodland', 'Farnborough', 'landscape', ['birch', 'oak', 'bluebells'], woodland,
      ['Bluebells along the birch path', 'A fallen branch beneath a mature oak', 'Golden leaves on the woodland floor', 'A quiet clearing in evening light']],
    [7, 'farnborough-airship-hangar', 'Portable Airship Hangar', 'Farnborough', 'heritage', ['aviation', 'steel frame', 'heritage'], hangar,
      ['The restored frame across the lawn', 'Looking through the open steel portals', 'Autumn trees frame the historic structure', 'The braced frame against the evening sky']],
  ];
  for (let view = 0; view < 4; view++) for (const [index, place, label, town, kind, tags, draw, reasons] of places) {
    const reason = reasons[view];
    add('hampshire', kind, { id: `${place}-${view + 1}`, label, site: `${label} — ${reason}`,
      colour: kind === 'heritage' ? 'slate' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags,
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'autumn', 'evening'][view], viewReason: reason,
      svg: () => vista(4700 + index * 17 + view, () => draw(view), { path: false, flat: true, edgeNear: true, y: 610, autumn: view === 2, time: view === 3 ? 'dusk' : 'day', atmosphere: localAtmosphere(place, view, index) }) });
  }
}
