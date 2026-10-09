 /* Quiet historic brick bastions, a recessed gate and roofed inner court. */
 (function(){if(typeof sceneObjDefine!=='function')return;const D=sceneDraw;
  sceneObjDefine({id:'landmark.us-fort-mchenry',category:'landmark',weight:0,size:[1020,264],variants:1,seasonal:false,flippable:false,parts:['body','lit'],palette:{base:{brick:['#a96f55','#c58a67','#744e48','#4f4644'],stone:['#c3ae86','#8b8c76'],roof:['#637976','#3d5b61'],glass:'#729794'}},night:{glow:{window:'#f2cb91',lamp:'#ffdfaa'},on:.75},shadow:{rx:22,ry:2,h:3},reflect:true,tags:['landmark','us','place:us/place:baltimore'],build(){const body=[],lit=[];
  body.push({f:'@brick.2',d:'M-245-140V-218H-101V-140zM105-135V-214H239V-135z'},{f:'@roof.1',d:'M-260-216L-185-249-87-216zM91-212L165-245 254-212z'},{f:'@roof.0',d:'M-260-216L-185-249-119-216zM91-212L165-245 219-212z'});
  for(const x of [-229,-201,-173,-145,120,148,176,204])body.push({f:'@stone.0',d:D.rect(x-2,-201,20,33)},{f:'@glass',d:D.rect(x,-199,16,29),glow:'window'});
  const faces=[['@brick.0','M-498-106L-341-181-170-127-96-141 96-141 195-122 343-179 501-108V-31L355 13 181-48 96-35-96-35-180-45-354 17-498-33z'],['@brick.2','M-498-106L-354-77V17L-498-33zM-354-77L-170-127-180-45-354 17zM96-141L195-122 181-48 96-35zM343-179L355-77V13L501-31V-108z'],['@brick.1','M-498-106L-341-181-170-127-180-116-341-167-480-102zM195-122L343-179 501-108 481-102 343-166 198-111zM-96-141H96v12H-96z']];
  for(const[f,d]of faces)body.push({f,d});
  body.push({f:'@stone.1',d:'M-103-35v-95h206v95z'},{f:'@brick.3',d:'M-58-35v-57q58-75 116 0v57z'},{f:'@stone.0',d:'M-68-35v-57q0-70 68-70t68 70v57h-10v-57q0-60-58-60t-58 60v57z'},{f:'@roof.1',d:'M-38-36v-57q38-49 76 0v57z'},{f:'@glass',d:'M-28-37v-53q28-37 56 0v53z',glow:'window'});
  for(let y=-112;y<-30;y+=9){body.push({s:'@brick.3',w:.8,op:.5,d:`M-160 ${y}H-77M77 ${y}H170`,detail:true});for(let x=-150;x<=150;x+=28)if(Math.abs(x)>77)body.push({s:'@brick.1',w:.8,op:.5,d:`M${x+(y%2)*7} ${y}v7`,detail:true});}
  for(let i=0;i<22;i++){const t=i/21,x=-480+t*283,y=-99-t*25;body.push({s:'@brick.3',w:.9,op:.6,d:`M${D.f1(x)} ${D.f1(y)}l-5 61`,detail:true},{s:'@brick.1',w:.8,op:.6,d:`M${D.f1(x)} ${D.f1(y+24)}l17-5`,detail:true});}
  for(let i=0;i<24;i++){const x=202+i*12;body.push({s:'@brick.3',w:.9,op:.5,d:`M${x} ${-119-(x<343?(x-202)*.39:(486-x)*.44)}v58`,detail:true});}
  body.push({s:'@stone.0',w:4,d:'M-498-106L-354-77-170-127M195-122L355-77 501-108'},{s:'@stone.1',w:3,d:'M-498-33L-354 17-180-45M181-48L355 13 501-31'});
  for(const x of [-86,86]){body.push({f:'@roof.1',d:D.rect(x-3,-103,6,17)},{f:'#c6b087',d:D.rect(x-2,-102,4,11),glow:'lamp'});lit.push({f:'#ffd394',op:.12,d:D.ell(x,-88,18,28)});}return{body,lit};}});
 })();
