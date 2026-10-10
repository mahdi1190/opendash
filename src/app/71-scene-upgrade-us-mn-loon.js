/* Draft: the close loon and northern conifer islands retain the old subject.
   Reeds, stony margins and three small swimmers sit in living reflections. */
(function () {
  function compose(){
    const d={v:1,id:'us-mn-loon',view:{lat:47.83,lon:-91.44,heading:85,fov:78,horizon:425},at:'dawn',season:'auto',setting:'natural',weather:'live',particles:'season',
      palette:{base:{hill:['#9aafb0','#6e9093'],bank:['#627a56','#3e5e46','#294637']},spring:{bank:['#7b945e','#4e714d','#34543b']},summer:{bank:['#6b8551','#42633e','#2e4c31']},autumn:{bank:['#a1905a','#72633e','#4d4a31']},winter:{bank:['#c6d4d0','#94b0a9','#526f69'],hill:['#becdce','#99b2b6']}},
      layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l)),sky:{stars:200,clouds:{n:4,y:[65,245],speed:4},sunR:26,moonR:22},
      ground:[{layer:'horizon',d:'M-160 438Q148 373 479 414T1056 399T1760 412V501H-160Z',fill:'@hill.0'},
        {layer:'far',d:'M-160 479Q181 440 439 463T1045 450T1760 455V520H-160Z',fill:'@hill.1'},
        {layer:'mid',d:'M-160 558Q-50 526 96 527Q181 510 257 532Q285 546 353 543Q376 550 397 559Q360 565 324 562Q287 584 221 577Q99 589-160 574ZM1760 572Q1631 536 1511 528Q1456 514 1375 537Q1342 541 1295 551Q1263 565 1220 565Q1252 582 1301 581Q1355 603 1441 590Q1537 604 1760 589Z',fill:'@bank.1'},
        {layer:'near',d:'M-160 900V728Q83 657 298 733L414 900ZM1760 900V704Q1539 670 1372 749L1238 900Z',fill:'@bank.0'},
        {layer:'fore',d:'M-160 900V813Q89 759 247 836L324 900ZM1760 900V811Q1542 770 1354 860L1328 900Z',fill:'@bank.2'}],
      water:[{layer:'far',d:'M-160 480H1760V900H-160Z',y0:480,y1:900,base:['#b4cfce','#729fa5','#365e70'],reflect:true,shimmer:46,lightPath:true}],
      place:[{obj:'bird.us-common-loon',x:800,y:704,s:.85,layer:'near',seed:2201,reflect:true},
        {obj:'tree.cedar',x:-20,y:916,s:1.2,layer:'front',seed:2301},{obj:'tree.cedar',x:1625,y:919,s:1.43,flip:true,layer:'front',seed:2401},
        {obj:'bird.heron',x:1347,y:760,s:.45,layer:'near',seed:2501,reflect:true}],scatter:[],actors:[],flocks:[],camera:{pan:0,period:90}};
    d.scatter.push({obj:{'tree.us-loon-spruce':3,'tree.us-lake-paper-birch':1},layer:'far',seed:301,area:{rect:[-140,478,1740,491]},n:39,minGap:25,s:[.13,.32],variant:[0,1,2,3],flip:.5,anim:false,reflect:true,tint:{col:'#9eb3ab',k:[0,.16]}});
    [{poly:[[-160,520],[299,511],[436,551],[260,565],[-160,566]]},{poly:[[1198,537],[1402,507],[1760,520],[1760,583],[1365,570]]}].forEach((area,i)=>d.scatter.push({obj:'tree.us-loon-spruce',layer:'mid',seed:501+i*101,area,n:13,minGap:35,s:[.32,.64],variant:[0,1,2,3],flip:.5,reflect:true,tint:{col:'#77918a',k:[.08+i*.08,.08+i*.08]}}));
    const banks=[{poly:[[-160,708],[204,705],[290,759],[373,905],[-160,905]]},{poly:[[1445,712],[1760,695],[1760,905],[1306,905],[1377,786]]}];
    banks.forEach((area,i)=>{
      d.scatter.push({obj:{'plant.reed':3,'plant.grass':3,'ground.leaves':1,'ground.puddle':.6,'rock.stones':2,'rock.boulder':.7},layer:'fore',seed:901+i*149,area,n:250,minGap:7,s:[.37,.73],variant:[0,1],flip:.5,anim:false,tint:{col:'#9c9575',k:[.08+i*.06,.08+i*.06]}});
      d.scatter.push({obj:{'plant.reed':3,'plant.bulrush':1},layer:'near',seed:1201+i*127,area,n:20,minGap:27,s:[.5,.95],variant:[0,1],flip:.5,anim:'strip',reflect:true,tint:{col:'#9c9575',k:[.08+i*.06,.08+i*.06]}});
    });
    for(let i=0;i<3;i++)d.actors.push({obj:'bird.us-common-loon',layer:'mid',path:i%2?[[1260,594+i*19],[970,598+i*19]]:[[330,578+i*17],[680,584+i*17]],speed:3+i,loop:'pingpong',s:.2+i*.025,seed:1801+i*101,offset:.19+i*.3,flip:!!(i%2)});
    d.flocks.push({obj:'bird.goose-flight',n:8,area:[150,95,1460,330],speed:27,s:.42,seed:2001,layer:'far'},{obj:'animal.dragonfly',n:6,area:[385,635,1325,790],speed:11,s:.46,seed:2101,layer:'near'});
    // Real renderer reflection: same layer and waterline as the close bird,
    // clipped to irregular horizontal ribbons so the lake breaks its silhouette.
    let ribbons='';for(let i=0;i<21;i++){const y=706+i*9.1,h=2.6+i%3*.6,body=i<9,w=body?338-i*16:43+Math.max(0,i-15)*4,x=body?666+i*1.3:678-(i>15?(i-15)*2.4:0);ribbons+='M'+x+' '+y+'q'+w*.47+' -2 '+w+' 0v'+h+'q'+(-w*.53)+' 2 '+(-w)+' 0Z';}
    d.water.push({layer:'near',d:ribbons,y0:704,y1:900,base:['#6e9ba1','#527d88','#365e70'],reflect:true,shimmer:18,lightPath:false});
    return d;
  }
  animRegionSceneUpgrade('us','state:MN',{state:'live',landmarks:['bird.us-common-loon'],scene:compose});
})();
