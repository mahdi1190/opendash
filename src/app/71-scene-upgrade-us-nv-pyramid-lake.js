/* Open desert water, porous tufa islands, an unequal sage and gravel shore. */
(function () {
  function compose(){const d={v:1,id:'us-nv-pyramid-tufa',view:{lat:39.98,lon:-119.506,heading:71,fov:81,horizon:508},at:'dusk',season:'auto',setting:'natural',weather:'live',particles:'season',particleSeasons:{spring:'motes',summer:'motes',autumn:'motes'},signage:false,
    palette:{base:{range:['#9aa6b3','#8c9fa9'],bank:['#a99e83','#7e8167','#4d594c']},spring:{bank:['#a8ae8a','#7b8d68','#465e4d']},summer:{bank:['#b7ab84','#8e8e66','#566146']},autumn:{bank:['#bb9c7b','#998064','#655743']},winter:{range:['#c5cdd1','#a5b7bf'],bank:['#d1d3c7','#9eaaa1','#6d827c']}},
    sky:{stars:270,clouds:{n:3,y:[78,221],speed:3.6},sunR:29,moonR:25},layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='far'?{haze:.29}:{})),
    ground:[{layer:'horizon',d:'M-160 552V520L-25 485 84 491 178 453 251 477 349 450 425 474 514 463 603 479 695 457 786 479 879 460 973 481 1062 461 1171 478 1272 450 1353 470 1455 442 1534 468 1631 457 1760 489V554z',fill:'@range.0'},
      {layer:'far',d:'M-160 566V535Q48 513 208 527T528 529T866 531T1201 520T1760 531V574z',fill:'@range.1'},
      {layer:'mid',d:'M636 683Q682 666 753 671L816 656 882 675 929 679 956 690 877 704 773 703 683 696zM1145 643Q1210 626 1259 631L1317 648 1282 661 1187 659z',fill:'@bank.1'},
      {layer:'near',d:'M-160 900V777Q-4 744 150 766L279 816 376 900zM1760 900V761Q1637 728 1504 775L1364 845 1257 900z',fill:'@bank.0'},
      {layer:'fore',d:'M-160 900V842Q79 795 212 853L306 900zM1760 900V828Q1604 796 1476 858L1390 900z',fill:'@bank.1'},
      {layer:'front',d:'M-160 900V888Q95 845 248 886L287 900zM1760 900V875Q1563 847 1444 900z',fill:'@bank.2'}],
    water:[{layer:'far',d:'M-160 539Q-31 531 71 538T272 541Q344 535 420 539T601 537Q711 530 824 538T1037 540Q1142 532 1247 536T1451 539Q1587 530 1760 536V900H-160z',y0:598,y1:900,base:['#a6bcc2','#648a9e','#3d617e'],reflect:true,shimmer:52,lightPath:true}],place:[
      {obj:'rock.us-pyramid-tufa',x:797,y:681,s:.88,variant:0,layer:'mid',seed:41011,reflect:true},
      {obj:'rock.us-pyramid-tufa',x:1229,y:645,s:.44,variant:2,flip:true,layer:'mid',seed:41117,reflect:true},
      {obj:'rock.us-pyramid-tufa',x:350,y:598,s:.28,variant:3,layer:'far',seed:41221,reflect:true},
      {obj:'rock.us-pyramid-tufa',x:1053,y:591,s:.19,variant:1,layer:'far',seed:41327,reflect:true},
      {obj:'tree.us-rim-juniper',x:-43,y:917,s:.83,variant:0,layer:'front',seed:41437},
      {obj:'tree.us-rim-juniper',x:1671,y:914,s:.93,variant:2,flip:true,layer:'front',seed:41543},
      {obj:'bird.heron',x:1391,y:829,s:.48,layer:'fore',seed:41651},
      {obj:'rock.desert-boulder',x:151,y:863,s:.58,variant:1,layer:'fore',seed:41759},
      {obj:'animal.rabbit',x:1449,y:878,s:.43,layer:'fore',seed:41869}],scatter:[],actors:[{obj:'bird.goose',layer:'near',path:[[542,770],[1024,791],[1271,769]],s:.31,speed:5,loop:'pingpong',seed:41983}],flocks:[{obj:'bird.small-flight',layer:'far',n:10,area:[67,157,1527,337],s:.47,speed:32,seed:42097},{obj:'bird.goose-flight',layer:'far',n:6,area:[177,393,1433,468],s:.49,speed:26,seed:42203}]};
    const banks=[{poly:[[-160,772],[125,771],[263,823],[376,908],[-160,908]]},{poly:[[1501,779],[1760,752],[1760,908],[1252,908],[1370,843]]}];
    for(const [i,area]of banks.entries()){
      d.scatter.push({obj:{'ground.desert-gravel':4,'ground.desert-tuft':2,'plant.grass':1},layer:'fore',seed:42313+i*127,area,n:240,minGap:9,s:[.34,.76],variant:'random',flip:.5,anim:false,tint:{col:'#a99e84',k:[.04,.19]}});
      d.scatter.push({obj:{'plant.us-lake-sagebrush':3,'plant.desert-creosote':1},layer:'fore',seed:42631+i*139,area,n:15,minGap:38,s:[.2,.86],variant:'random',flip:.5,anim:false,tint:{col:'#94a18b',k:[.05,.22]}});
      d.scatter.push({obj:'ground.desert-tuft',layer:'fore',seed:42911+i*149,area,n:10,minGap:41,s:[.92,1.12],variant:'random',flip:.5,anim:'strip'});
    }
    d.scatter.push({obj:'plant.reed',layer:'near',seed:43211,area:{poly:[[1461,792],[1729,759],[1729,806],[1401,840]]},n:21,minGap:18,s:[.39,.69],variant:'random',flip:.5,anim:'strip',reflect:true,tint:{col:'#9b9d7d',k:[.12,.3]}});
    for(const [x,y,w,layer,n,phase]of [[797,681,350,'mid',23,1.7],[1229,645,207,'mid',14,4.1]]){
      let mask='';for(let i=0;i<n;i++){
        const yy=y+3+i*7.1+Math.sin(i*2.37+phase)*1.5,ww=w*(.57+.27*Math.sin(i*1.91+phase)),xx=x-ww*.5+Math.sin(i*2.81+phase)*w*.13,cut=.33+.18*Math.sin(i*3.13+phase),gap=9+9*(1+Math.sin(i*2.17));
        for(const [sx,sw]of [[xx,ww*cut],[xx+ww*cut+gap,ww*(1-cut)-gap]])mask+=`M${sx.toFixed(1)} ${yy.toFixed(1)}q${(sw*.43).toFixed(1)} -1.3 ${sw.toFixed(1)} 0v${(1.3+(i%4)*.52).toFixed(1)}q${(-sw*.48).toFixed(1)} 1.7 ${(-sw).toFixed(1)} 0z`;
      }
      d.water.push({layer,d:mask,y0:y,y1:900,base:['#9cb5bf','#628b9f','#3d617e'],reflect:true,shimmer:10,lightPath:false});
    }
    return d;
  }
  animRegionSceneUpgrade('us','state:NV',{state:'draft',landmarks:['rock.us-pyramid-tufa'],scene:compose});
})();
