/* us-pacific/or-crater-lake: Crater Lake and Wizard Island. Unique hand-placed composition, pending panel. */
(function(){const SITE={"lat":45.52,"lon":-122.68};
 const B=(o)=>({v:1,id:o.id,view:{lat:o.lat??SITE.lat,lon:o.lon??SITE.lon,heading:o.heading||110,fov:78,horizon:o.H||530},at:o.at||'golden',season:'auto',setting:o.setting||'natural',weather:'live',particles:'season',layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l)),sky:{stars:180,clouds:{n:4,y:[65,(o.H||530)-230],speed:4},sunR:26,moonR:22},palette:{base:{hill:['#a2b6b5','#749496','#4e7477'],ground:['#789359','#526f45','#304c38'],path:['#c4b79b','#918d77'],sand:['#d2bd91','#b39d73','#8c7c5d'],rock:['#a0aaa6','#718687','#475e68'],water:['#aed0d5','#73a1b2','#365f7b']},spring:{ground:['#92ad65','#6e8f4d','#446a40']},summer:{ground:['#7e9a55','#55793f','#355b39']},autumn:{ground:['#a18d59','#78643d','#4d4c32'],hill:['#aeb6a6','#929b87','#687e76']},winter:{ground:['#d2dcd8','#afc3bf','#769996'],path:['#cdd9d5','#a3bbb8'],sand:['#d5d3c1','#bdbca6','#969f92'],hill:['#c0d2d4','#9bb8c0','#7298a8']}},ground:[],water:[],place:[],scatter:[],actors:[],flocks:[],camera:{pan:0,period:90}});
 const G=(d,l,p,f)=>d.ground.push({layer:l,d:p,fill:f});
 const P=(d,obj,x,y,s,layer,seed,extra={})=>d.place.push(Object.assign({obj,x,y,s,layer,seed},extra));
 const W=(d,l,p,y0,y1,base=['#b3d1d4','#77a3b2','#365f7a'])=>d.water.push({layer:l,d:p,y0,y1,base,reflect:true,shimmer:32,lightPath:true});
 const C=(d,areas,mix,n=190,seed=1103)=>areas.forEach((area,i)=>{d.scatter.push({obj:mix,layer:'fore',seed:seed+i*211,area,n,minGap:11,s:[.36,.75],variant:[0,1,2],flip:.5,anim:false,tint:{col:'#988c66',k:[0,.16]}});d.scatter.push({obj:'plant.us-lake-clover',layer:'near',seed:seed+701+i*149,area,n:18,minGap:31,s:[.44,.75],variant:[0,1,2],flip:.5,anim:'strip',tint:{col:'#77836a',k:[0,.16]}});});
 const T=(d,l,area,n,seed,range=[.25,.7],mix={'tree.us-lake-paper-birch':2,'tree.us-loon-spruce':1})=>d.scatter.push({obj:mix,layer:l,area,n,seed,minGap:39,s:range,variant:[0,1,2],flip:.5,anim:false,reflect:true,tint:{col:'#9aaba6',k:[0,.16]}});
 const A=(d,obj,path,s,speed,seed,layer='mid',offset=.2)=>d.actors.push({obj,path,s,speed,seed,layer,offset,loop:'loop',reflect:true});
 const Life=(d,seed=3301,{coast=false,cold=false,city=false}={})=>{d.flocks.push({obj:coast?'bird.herring-gull-flight':'bird.goose-flight',n:9,area:[-180,90,1780,(d.view.horizon||530)-115],speed:25,s:coast?.5:.4,seed,layer:'far'},{obj:cold?'bird.goose-flight':'animal.butterfly',n:6,area:cold?[-180,125,1780,350]:[-180,680,1780,820],speed:cold?20:9,s:cold?.3:.5,seed:seed+137,layer:cold?'far':'near'});P(d,'animal.rabbit',307,842,.7,'fore',seed+283);P(d,'animal.squirrel',1393,829,.7,'fore',seed+419);if(city)for(let i=0;i<3;i++)A(d,'person.walker',i%2?[[1750,789],[-150,789]]:[[-150,801],[1750,801]],scenePersonScale(sceneObj('person.walker').size[1],795,d.view),14+i*4,seed+557+i*103,'near',.12+i*.29);};

 function compose(){return (function(){const d=B({id:'us-or-crater-lake',H:540,heading:75,at:'night'});
 for(const [season,c]of Object.entries({base:['#20363b','#3b5150'],spring:['#22392f','#405743'],summer:['#20362e','#395341'],autumn:['#32382d','#505543'],winter:['#253c47','#445b65']}))d.palette[season].frame=c;
 P(d,'sky.us-crater-milky-way',800,513,1,'horizon',23083,{shadow:false});
 G(d,'horizon','M-160 573L52 524 217 536 361 487 472 512 619 472 797 501 982 471 1126 517 1289 481 1439 520 1760 489V682H-160Z','@hill.0');
 G(d,'far','M-160 649Q217 580 498 620T1043 597T1760 613V696H-160Z','@rock.1');
 W(d,'mid','M-160 663Q364 634 824 657T1760 641V900H-160Z',653,900,['#89b9ca','#4d8ba9','#285c82']);
 W(d,'mid','M-160 699Q364 688 824 699T1760 691V900H-160Z',696,900,['#7cacc0','#4d8ba9','#285c82']);
 P(d,'rock.us-wizard-island',809,696,.74,'mid',23113,{reflect:true,shadow:false});
 G(d,'near','M-160 652Q200 630 824 651T1760 638V735H-160Z',{lin:[[0,'@water.0',0],[.54,'@water.0',.45],[1,'@water.0',0]],y1:641,y2:735});
 T(d,'far',{poly:[[-140,616],[440,610],[483,664],[-140,681]]},16,23203,[.19,.43],{'tree.us-loon-spruce':1,'tree.us-lake-paper-birch':1});T(d,'far',{poly:[[1219,604],[1740,603],[1740,676],[1188,660]]},18,23281,[.2,.49],{'tree.us-loon-spruce':1,'tree.us-lake-paper-birch':1});
 G(d,'near','M-160 900V737Q56 699 271 757Q449 812 546 900ZM1031 900Q1287 708 1760 731V900Z',{lin:[[0,'@rock.0'],[.42,'@rock.1'],[1,'@frame.1']],y1:712,y2:900});G(d,'fore','M-160 900V807Q73 780 317 900ZM1230 900Q1529 790 1760 811V900Z','@ground.2');
 G(d,'near','M-160 735Q56 698 271 757Q449 812 546 900H524Q435 825 262 771Q45 717-160 755ZM1031 900Q1287 708 1760 731V747Q1297 727 1051 900Z',{lin:[[0,'@water.0',.34],[1,'@water.0',0]],y1:714,y2:856});
 C(d,[{poly:[[-140,812],[239,824],[490,900],[-140,900]]},{poly:[[1089,900],[1410,793],[1740,817],[1740,900]]}],{'plant.us-tundra-sedge':3,'plant.us-sword-fern':1},225,23359);
 G(d,'front','M-160 900V774Q-8 737 42 779L83 765Q144 759 193 806L235 798Q286 818 314 864L358 900ZM1217 900Q1261 862 1306 857L1344 812Q1401 819 1446 795Q1510 757 1591 787L1760 772V900Z','@frame.0');
 G(d,'front','M-160 841Q-7 817 56 840Q135 812 207 866L248 856 301 900ZM1322 900Q1393 858 1452 870Q1541 824 1760 842V900Z','@frame.1');
 P(d,'tree.us-loon-spruce',104,909,1.04,'front',23431);P(d,'tree.us-loon-spruce',1486,915,.94,'front',23503,{flip:true,variant:2});Life(d,23581,{cold:true});return d;})();}
 animRegionSceneUpgrade('us',"state:OR",{state:'live',landmarks:["rock.us-wizard-island"],scene:compose});})();
