/* us-midwest/il-skyline: The Chicago skyline from the lake. Unique hand-placed composition, pending panel. */
(function(){
 const B=(o)=>({v:1,id:o.id,view:{lat:o.lat,lon:o.lon,heading:o.heading||110,fov:78,horizon:o.H||530},at:o.at||'golden',season:'auto',setting:o.setting||'natural',weather:'live',particles:'season',layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l)),sky:{stars:180,clouds:{n:4,y:[65,(o.H||530)-230],speed:4},sunR:26,moonR:22},palette:{base:{hill:['#a2b6b5','#749496','#4e7477'],ground:['#789359','#526f45','#304c38'],path:['#c4b79b','#918d77'],sand:['#d2bd91','#b39d73','#8c7c5d'],rock:['#a0aaa6','#718687','#475e68'],water:['#aed0d5','#73a1b2','#365f7b']},spring:{ground:['#92ad65','#6e8f4d','#446a40']},summer:{ground:['#7e9a55','#55793f','#355b39']},autumn:{ground:['#a18d59','#78643d','#4d4c32'],hill:['#aeb6a6','#929b87','#687e76']},winter:{ground:['#d2dcd8','#afc3bf','#769996'],path:['#cdd9d5','#a3bbb8'],sand:['#d5d3c1','#bdbca6','#969f92'],hill:['#c0d2d4','#9bb8c0','#7298a8']}},ground:[],water:[],place:[],scatter:[],actors:[],flocks:[],camera:{pan:0,period:90}});
 const G=(d,l,p,f)=>d.ground.push({layer:l,d:p,fill:f});
 const P=(d,obj,x,y,s,layer,seed,extra={})=>d.place.push(Object.assign({obj,x,y,s,layer,seed},extra));
 const W=(d,l,p,y0,y1,base=['#b3d1d4','#77a3b2','#365f7a'])=>d.water.push({layer:l,d:p,y0,y1,base,reflect:true,shimmer:32,lightPath:true});
 const C=(d,areas,mix,n=190,seed=1103)=>areas.forEach((area,i)=>{d.scatter.push({obj:{'plant.us-lake-meadow':2,'plant.us-lake-clover':1},layer:'fore',seed:seed+i*211,area,n:Math.round(n*.9),minGap:13,s:[.45,.86],variant:[0,1,2],flip:.5,anim:false,tint:{col:'#988c66',k:[0,.16]}});d.scatter.push({obj:'plant.us-lake-meadow',layer:'near',seed:seed+701+i*149,area,n:18,minGap:31,s:[.48,.88],variant:[0,1],flip:.5,anim:'strip',tint:{col:'#77836a',k:[0,.16]}});});
 const T=(d,l,area,n,seed,range=[.25,.7],mix={'tree.us-lake-paper-birch':2,'tree.us-loon-spruce':1})=>d.scatter.push({obj:mix,layer:l,area,n,seed:seed+97,minGap:39,mask:{noise:{scale:117,cut:.2}},s:range,variant:[0,1],flip:.5,anim:false,reflect:true,tint:{col:'#9aaba6',k:[0,.16]}});
 const A=(d,obj,path,s,speed,seed,layer='mid',offset=.2)=>d.actors.push({obj,path,s,speed,seed,layer,offset,loop:'loop',reflect:true});
 const Life=(d,seed=3301,{coast=false,cold=false,city=false}={})=>{d.flocks.push({obj:coast?'bird.herring-gull-flight':'bird.goose-flight',n:9,area:[100,90,1520,(d.view.horizon||530)-115],speed:25,s:coast?.5:.4,seed,layer:'far'},{obj:cold?'bird.goose-flight':'animal.butterfly',n:6,area:cold?[200,125,1440,350]:[250,680,1390,820],speed:cold?20:9,s:cold?.3:.5,seed:seed+137,layer:cold?'far':'near'});P(d,'animal.rabbit',307,842,.7,'fore',seed+283);P(d,'animal.squirrel',1393,829,.7,'fore',seed+419);if(city)for(let i=0;i<3;i++)A(d,'person.walker',i%2?[[1750,789],[-150,789]]:[[-150,801],[1750,801]],scenePersonScale(sceneObj('person.walker').size[1],795,d.view),14+i*4,seed+557+i*103,'near',.12+i*.29);};

 function compose(){return (function(){
 const d=B({id:'us-il-skyline',lat:41.88,lon:-87.62,H:540,heading:270,setting:'urban',at:'dusk'});
 G(d,'horizon','M-160 555Q230 522 510 544T1120 532T1760 551V610H-160Z','@hill.0');
 G(d,'far','M-160 603Q305 574 690 590T1760 582V653H-160Z','@hill.1');
 P(d,'building.us-chicago-lakefront-depth',800,614,1,'far',2801,{shadow:false,tint:['#a0b8ba',.16]});P(d,'prop.us-navy-pier-wheel',341,622,.69,'mid',2807,{shadow:false});
 P(d,'landmark.us-il-skyline',800,620,.8,'mid',2711,{shadow:false});
 G(d,'mid','M-160 616Q39 603 201 615L280 621L432 615Q639 606 801 616T1177 613L1339 620Q1559 607 1760 615V649H-160Z','@rock.1');
 W(d,'mid','M-160 631Q121 625 297 629L353 634Q570 623 831 628T1331 627L1390 635Q1557 624 1760 630V900H-160Z',627,900,['#bed5dc','#80a8ba','#365e76']);
 G(d,'near','M1039 900Q1096 823 1209 768L1760 703V900Z','@path.1');
 G(d,'fore','M-160 808Q82 773 213 817Q312 850 500 900H-160ZM1156 900Q1268 848 1437 816T1760 792V900Z','@ground.1');
 G(d,'front','M-160 865Q101 835 315 900H-160ZM1350 900Q1480 860 1760 843V900Z','@ground.2');
 T(d,'far',{poly:[[-140,589],[240,583],[290,620],[-140,628]]},9,2813,[.2,.45]);
 P(d,"tree.us-lake-paper-birch",-12,929,1.65,'front',2917,{tint:['#3b544b',.16]});P(d,"tree.us-mackinac-paper-birch",1645,930,1.45,'front',2971,{tint:['#26483d',.24]});
 C(d,[{poly:[[-140,816],[147,814],[425,900],[-140,900]]},{poly:[[1244,865],[1600,819],[1740,839],[1740,900],[1178,900]]}],{'plant.grass':3,'plant.reed':1.6,'plant.wildflowers':.5},145,3041);
 [[1241,820,.66],[1306,804,.81],[1397,797,.58],[1438,776,.88],[1530,762,.72],[1614,755,.93]].forEach((q,i)=>P(d,'rock.stones',q[0],q[1],q[2],'near',3163+i*31,{variant:i%4,flip:!!(i%2)}));
 A(d,'boat.dinghy',[[-180,704],[1780,704]],.43,6,3257,'mid',.2);A(d,'boat.ferry',[[1790,752],[-190,752]],.4,10,3329,'mid',.62);
 for(let i=0;i<11;i++)P(d,'structure.us-chicago-l-pier',800-907+i*181.4,908,1,'near',3581+i*17,{reflect:false});
 P(d,'structure.us-chicago-l-trestle',800,867,1,'near',3613,{reflect:false,shadow:false});
 A(d,'vehicle.us-chicago-elevated-train',[[-480,784],[2080,784]],.75,34,3691,'near',.43);
 d.layers.find(l=>l.id==='far').haze=.32;
 Life(d,3407,{coast:true});
 for(const p of d.place)if(p.obj==='animal.rabbit'||p.obj==='animal.squirrel')p.s=.38;
 return d;
})();}
 animRegionSceneUpgrade('us',"state:IL",{state:'live',landmarks:["landmark.us-il-skyline"],scene:compose});})();
