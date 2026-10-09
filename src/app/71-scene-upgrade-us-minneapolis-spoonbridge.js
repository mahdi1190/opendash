/* us-midwest/minneapolis-spoonbridge: The Spoonbridge and Cherry. Unique hand-placed composition, pending panel. */
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
 const d=B({id:'us-minneapolis-spoonbridge',lat:44.97,lon:-93.29,H:550,heading:210,setting:'urban',at:'afternoon'});
 G(d,'horizon','M-160 590Q203 539 582 573T1260 553T1760 567V656H-160Z','@hill.0');
 G(d,'far','M-160 658Q211 611 594 634Q1087 592 1760 646V900H-160Z','@ground.0');
 P(d,'building.us-minneapolis-garden-depth',824,628,.82,'far',7201,{shadow:false,tint:['#a3bcb3',.16]});
 T(d,'far',{poly:[[-140,618],[1738,607],[1738,661],[-140,666]]},27,7211,[.28,.6]);
 G(d,'mid','M180 740Q268 661 576 648Q1040 617 1319 712Q1135 804 597 809Q332 795 180 740Z','@rock.1');
 W(d,'mid','M239 740Q376 681 683 675Q1062 646 1260 719Q1062 779 683 782Q389 777 239 740Z',680,790,['#bad3c8','#7daba4','#4b737b']);
 P(d,'landmark.us-minneapolis-spoonbridge',740,680,.9,'mid',7331,{reflect:true,shadow:false});
 G(d,'near','M-160 784Q198 782 368 818Q688 871 1001 846Q1296 809 1760 751V811Q1399 848 1096 894H403Q169 849-160 854Z','@path.0');
 G(d,'fore','M-160 858Q181 836 422 900H-160ZM1066 900Q1401 852 1760 815V900Z','@ground.1');
 G(d,'front','M-160 886Q76 868 269 900H-160ZM1462 900Q1607 870 1760 868V900Z','@ground.2');
 P(d,"tree.us-lake-paper-birch",-84,939,1.65,'front',7457,{tint:['#284b3c',.24]});P(d,"tree.us-mackinac-paper-birch",1643,941,1.45,'front',7499,{tint:['#284b3c',.24]});
 C(d,[{poly:[[-140,867],[177,856],[375,900],[-140,900]]},{poly:[[1158,895],[1600,847],[1740,837],[1740,900]]}],{'plant.grass':3,'plant.wildflowers':1,'plant.reed':.3},166,7537);
 d.scatter.push({obj:'plant.us-minneapolis-garden-perennial',layer:'fore',seed:7817,area:{poly:[[1112,880],[1390,838],[1730,833],[1730,896],[1196,896]]},n:31,minGap:27,s:[.7,1.05],variant:[0,1,2],flip:.5,anim:'strip',tint:{col:'#a4a17c',k:[0,.16]}});
 d.scatter.push({obj:'plant.us-minneapolis-garden-perennial',layer:'near',seed:7907,area:{poly:[[-100,854],[99,841],[264,881],[182,896],[-100,882]]},n:19,minGap:24,s:[.55,.84],variant:[0,1,2],flip:.5,anim:false,tint:{col:'#939d7f',k:[0,.16]}});
 P(d,'street.lamp',271,791,.42,'near',7643);P(d,'street.lamp',1414,822,.47,'near',7699);Life(d,7733);
 A(d,'person.walker',[[-150,793],[1750,793]],.52,14,8011,'near',.27);
 A(d,'person.jogger',[[1750,814],[-150,814]],.62,23,8089,'near',.64);
 for(const p of d.place)if(p.obj==='animal.rabbit'||p.obj==='animal.squirrel')p.s=.38;
 return d;
})();}
 animRegionSceneUpgrade('us',"place:minneapolis",{state:'live',landmarks:["landmark.us-minneapolis-spoonbridge"],scene:compose});})();
