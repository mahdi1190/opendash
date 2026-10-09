/* us-midwest/detroit-ren-cen: The Renaissance Center. Unique hand-placed composition, pending panel. */
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
 const d=B({id:'us-detroit-ren-cen',lat:42.33,lon:-83.04,H:530,heading:130,setting:'urban',at:'dawn'});
 G(d,'horizon','M-160 562Q190 536 582 554T1173 542T1760 556V611H-160Z','@hill.0');
 G(d,'far','M-160 598Q330 571 680 594T1760 582V642H-160Z','@hill.1');
 P(d,'building.us-detroit-river-depth',800,615,1,'far',4301,{shadow:false,tint:['#a4b8b8',.16]});
 P(d,'landmark.us-detroit-ren-cen',800,617,.85,'mid',4211,{shadow:false});
 G(d,'mid','M-160 605Q460 594 910 608T1760 602V644H-160Z','@rock.1');
 W(d,'mid','M-160 641Q630 636 1760 648V900H-160Z',641,900,['#bdd0d0','#7b9f9f','#3e6874']);
 G(d,'near','M-160 706Q134 711 359 791Q504 849 621 900H-160Z','@path.1');
 G(d,'fore','M-160 761Q143 760 357 850L459 900H-160ZM1282 900Q1428 832 1760 811V900Z','@ground.1');
 G(d,'front','M-160 847Q61 821 294 900H-160ZM1454 900Q1550 863 1760 852V900Z','@ground.2');
 T(d,'far',{poly:[[-140,587],[405,593],[411,620],[-140,630]]},14,4337,[.15,.32]);
 P(d,"tree.us-lake-paper-birch",-21,919,1.65,'front',4451);P(d,"tree.us-mackinac-paper-birch",1641,924,1.45,'front',4463,{tint:['#20483c',.24]});
 C(d,[{poly:[[-140,790],[173,820],[398,900],[-140,900]]},{poly:[[1366,882],[1575,839],[1740,836],[1740,900]]}],{'plant.grass':3,'plant.reed':1.2,'plant.wildflowers':.5},156,4517);
 for(let i=0;i<3;i++)P(d,'street.lamp',66+i*97,736+i*33,.43+i*.06,'near',4621+i*59);
 A(d,'boat.fishing-boat',[[-180,705],[1790,705]],.55,8,4783,'mid',.43);A(d,'boat.ferry',[[1790,762],[-180,762]],.4,12,4813,'mid',.74);
 Life(d,4931,{coast:true});return d;
})();}
 animRegionSceneUpgrade('us',"place:detroit",{state:'draft',landmarks:["landmark.us-detroit-ren-cen"],scene:compose});})();
