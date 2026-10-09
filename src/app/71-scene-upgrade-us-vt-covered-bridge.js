/* Composed rebuild of us-northeast/vt-covered-bridge. Draft pending review.
   A red timber bridge spans the maple-lined stream. The channel, stone
   banks and large asymmetric maples retain the original picture's story. */
(function () {
  const palette = { base:{hill:['#7e9590','#5d7a63'],bank:['#647346','#3e583b','#263d30'],sand:['#99856a','#b7a584']},
    spring:{bank:['#6a8a49','#476a3c','#2d5037'],hill:['#8fa58b','#728d6a']},
    summer:{bank:['#617c3e','#3f6136','#28472e'],hill:['#83977d','#657f61']},
    autumn:{bank:['#998143','#6e5934','#493e2b'],hill:['#a7a18b','#8b8265']},
    winter:{bank:['#d3d9d3','#aab7b0','#758b83'],hill:['#b9c9c8','#94aaa5'],sand:['#c5cec9','#e0e7e3']} };
  const layers=[{id:'horizon',depth:.06,haze:.7},{id:'far',depth:.2,haze:.43},{id:'mid',depth:.42,haze:.18},{id:'near',depth:.73,haze:.04},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}];
  function compose(){
    const d={v:1,id:'us-vt-covered-bridge',view:{lat:43.66,lon:-72.52,heading:245,fov:78,horizon:545},at:'golden',season:'auto',setting:'natural',weather:'live',particles:'season',palette,layers,
      sky:{stars:180,clouds:{n:4,y:[75,300],speed:4},sunR:24,moonR:21},
      ground:[
        {layer:'horizon',d:'M-160 551V514Q70 400 276 480T630 460Q850 378 1010 468T1350 478Q1570 415 1760 484V605H-160z',fill:'@hill.0'},
        {layer:'far',d:'M-160 600V554Q165 494 390 547T827 536Q1070 485 1340 538T1760 516V608H-160z',fill:'@hill.1'},
        {layer:'mid',d:'M-160 900V594Q212 561 454 609C508 628 589 616 650 623L759 647Q762 666 723 678T670 697Q614 716 578 741T506 779Q453 803 411 846T342 900zM1760 900V577Q1415 560 1150 615Q1094 631 1017 664Q1024 675 1039 681T1051 699Q1052 705 1066 714T1088 736Q1109 739 1125 762T1141 783Q1167 794 1177 813T1202 841Q1225 849 1238 874T1265 900z',fill:{lin:[[0,'@bank.0'],[1,'@bank.1']],y1:580,y2:900}},
        {layer:'near',d:'M-160 900V694Q165 632 461 689Q449 707 424 712T392 733Q370 739 361 757T320 796Q259 845 212 900zM1760 900V650Q1450 629 1130 691Q1152 715 1168 718T1197 749Q1212 752 1230 777T1263 815Q1324 853 1370 900z',fill:'@bank.1'},
        {layer:'near',d:'M160 910Q341 783 550 686L619 641 761 638Q733 667 669 689Q466 783 369 910z',fill:'@sand.0'},
        {layer:'near',d:'M165 910Q341 786 552 690L623 647 755 644L744 653 631 657Q426 786 192 910zM1190 628Q1377 588 1760 596V613Q1418 603 1200 643z',fill:'@sand.1'},
        {layer:'near',d:'M634 660Q682 647 762 652L757 668 728 679 687 685 646 682zM1158 627L1210 621 1236 641 1200 660 1160 657z',fill:'#7f8273'},
        {layer:'fore',d:'M-160 900V792Q60 744 233 803L371 900zM1760 900V764Q1520 744 1370 813L1247 900z',fill:'@bank.2'},
        {layer:'front',d:'M-160 900V859Q90 827 304 900zM1760 900V844Q1550 815 1312 900z',fill:'@bank.2'},
      ],
      water:[{layer:'horizon',d:'M460 604Q740 581 1144 615Q1060 639 1016 667Q1058 741 1276 900H218Q340 775 464 690L576 656z',y0:604,y1:900,base:['#aac5bc','#6a9d9e','#305e72'],reflect:true,shimmer:44,lightPath:true}],
      place:[{obj:'landmark.us-vt-covered-bridge',x:870,y:654,s:.9,layer:'near',seed:5317,shadow:false},
        {obj:'ground.us-vt-bridge-reflection',x:870,y:676,s:.9,layer:'near',seed:5419},
        {obj:'tree.us-northern-maple',x:38,y:909,s:1.32,variant:1,layer:'front',seed:5629},
        {obj:'tree.us-northern-maple',x:1544,y:914,s:1.43,variant:3,flip:true,layer:'front',seed:5807},
        {obj:'tree.us-northern-maple',x:215,y:707,s:.54,variant:0,layer:'near',seed:6011},
        {obj:'tree.us-northern-maple',x:1358,y:692,s:.65,variant:2,layer:'near',seed:6199},
        {obj:'ground.log',x:1302,y:802,s:.49,variant:1,flip:true,layer:'fore',seed:6311,anim:false},
        {obj:'animal.rabbit',x:304,y:811,s:.75,variant:0,layer:'fore',seed:6521},
        {obj:'animal.rabbit',x:1328,y:752,s:.49,variant:1,flip:true,layer:'near',seed:6709},
        {obj:'animal.squirrel',x:145,y:856,s:.8,layer:'fore',seed:6971},
        {obj:'bird.robin',x:1328,y:784,s:.64,variant:1,layer:'fore',seed:7103},
      ],scatter:[],actors:[
        {obj:'bird.mallard',layer:'near',path:[[620,710],[916,729],[1038,770]],speed:5,loop:'pingpong',s:.42,variant:0,seed:7433,offset:.16},
        {obj:'bird.mallard',layer:'near',path:[[980,773],[820,739],[660,725]],speed:4,loop:'pingpong',s:.38,variant:1,seed:7603,offset:.7},
      ],flocks:[{obj:'bird.small-flight',n:9,layer:'horizon',area:[160,170,1460,310],speed:27,s:.42,seed:7793},{obj:'bird.small-flight',n:4,layer:'horizon',area:[380,340,1150,418],speed:34,s:.5,seed:8011}]};
    d.scatter.push({obj:{'tree.us-northern-maple':1,'tree.far-birch':1},layer:'far',seed:8297,area:{rect:[-160,524,1760,604]},n:36,minGap:42,s:[.16,.28],variant:[0,1],flip:.5,anim:false,tint:{col:'#b18b57',k:[.04,.12]},reflect:true});
    // Texture stays on the banks; the stream remains an open lead-in to the bridge.
    const banks=[{poly:[[-160,662],[449,687],[365,748],[212,905],[-160,905]]},{poly:[[1150,681],[1760,639],[1760,905],[1362,905],[1232,753]]}];
    banks.forEach((area,i)=>{
      d.scatter.push({obj:{'plant.grass':3,'plant.reed':1,'ground.leaves':2,'ground.puddle':1,'rock.stones':1,'rock.boulder':.5},layer:'fore',seed:8431+i*211,area,n:150,minGap:7,s:[.4,.7],variant:[0,1],flip:.5,anim:false,tint:{col:'#a8874a',k:[.08+i*.04,.08+i*.04]}});
      d.scatter.push({obj:{'plant.grass':2,'plant.reed':1},layer:'fore',seed:8971+i*227,area,n:34,minGap:19,s:[.5,1],variant:'random',flip:.5,anim:'strip',tint:{col:'#987944',k:[.12,.12]}});
      d.scatter.push({obj:'plant.fern',layer:'near',seed:9491+i*241,area,n:2,minGap:95,s:.48,variant:1,flip:!!i,anim:false});
    });
    d.scatter.push({obj:{'plant.grass':2,'plant.reed':1,'ground.leaves':1,'rock.stones':1},layer:'mid',seed:10069,area:{poly:[[-160,605],[439,633],[429,678],[-160,699]]},n:90,minGap:8,s:[.21,.24],variant:[0,1],flip:.5,anim:false,tint:{col:'#b8a276',k:[.15,.15]},reflect:true});
    d.scatter.push({obj:{'plant.grass':2,'plant.reed':1,'ground.leaves':1,'rock.boulder':1},layer:'mid',seed:10321,area:{poly:[[1200,609],[1760,589],[1760,651],[1168,682]]},n:75,minGap:8,s:[.21,.24],variant:[0,1],flip:.5,anim:false,tint:{col:'#b8a276',k:[.15,.15]},reflect:true});
    d.scatter.push({obj:{'plant.grass':3,'plant.reed':1,'ground.leaves':2,'ground.puddle':1,'rock.stones':1,'rock.boulder':.5},layer:'fore',seed:10559,area:{poly:[[1086,681],[1115,684],[1227,751],[1343,905],[1274,905],[1192,752]]},n:85,minGap:8,s:[.4,.7],variant:[0,1],flip:.5,anim:false,tint:{col:'#a8874a',k:[.12,.12]}});
    d.scatter.push({obj:{'plant.grass':2,'ground.leaves':3,'rock.stones':3},layer:'fore',seed:10853,area:{poly:[[432,691],[498,674],[478,716],[403,788],[366,861],[332,905],[294,905],[342,810]]},n:70,minGap:7,s:[.4,.7],variant:[0,1],flip:.5,anim:false,tint:{col:'#a8874a',k:[.08,.08]}});
    d.scatter.push({obj:{'rock.stones':2,'plant.grass':2,'ground.leaves':1},layer:'near',seed:11083,area:{poly:[[605,676],[648,681],[716,673],[732,682],[669,705],[609,714],[557,734],[544,723]]},n:42,minGap:6,s:[.22,.4],variant:[0,1],flip:.5,anim:false,tint:{col:'#b8a276',k:[.15,.15]}});
    return d;
  }
  animRegionSceneUpgrade('us','state:VT',{state:'live',landmarks:['landmark.us-vt-covered-bridge'],scene:compose});
})();
