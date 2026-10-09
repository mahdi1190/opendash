/* us-midwest/milwaukee-art-museum: The Milwaukee Art Museum. Unique hand-placed composition, pending panel. */
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
 const d=B({id:'us-milwaukee-art-museum',lat:43.04,lon:-87.9,H:540,heading:90,setting:'urban',at:'morning'});
 G(d,'horizon','M-160 575Q444 540 899 560T1760 549V638H-160Z','@hill.0');
 W(d,'far','M-160 595H1760V900H-160Z',595,900,['#c6d9db','#87afc0','#426d86']);
 G(d,'mid','M-160 624Q360 613 781 633T1234 657L1379 765Q916 815-160 789Z','@path.0');
 P(d,'landmark.us-milwaukee-art-museum',800,641,1,'mid',6211,{shadow:false});
 G(d,'near','M545 900Q628 824 734 773Q795 732 819 702L884 704Q866 769 801 808Q710 864 692 900Z','@path.0');
 G(d,'fore','M-160 813Q180 790 390 851L547 900H-160ZM953 900Q1160 818 1389 834T1760 807V900Z','@ground.1');
 G(d,'front','M-160 876Q92 839 269 900H-160ZM1438 900Q1542 853 1760 856V900Z','@ground.2');
 P(d,"tree.us-lake-paper-birch",-94,947,1.65,'front',6337,{tint:['#294d42',.24]});P(d,"tree.us-mackinac-paper-birch",1661,939,1.45,'front',6361,{tint:['#23473e',.24]});
 C(d,[{poly:[[-140,841],[214,831],[468,900],[-140,900]]},{poly:[[1102,878],[1377,845],[1740,835],[1740,900]]}],{'plant.grass':2,'plant.wildflowers':1.3},161,6419);
 for(let i=0;i<5;i++)P(d,'street.lamp',981+i*62,759+i*14,.44+i*.025,'near',6551+i*71);
 A(d,'boat.dinghy',[[-180,685],[1780,685]],.35,7,6637,'far',.35);Life(d,6733,{coast:true,city:true});return d;
})();}
 animRegionSceneUpgrade('us',"place:milwaukee",{state:'draft',landmarks:["landmark.us-milwaukee-art-museum"],scene:compose});})();
