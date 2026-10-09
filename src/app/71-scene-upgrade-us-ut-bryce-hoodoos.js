/* A rim opening into Bryce's amphitheatre: overlapping fins and necked
   hoodoos, a pale hammer cap in the centre and bristlecone roots at the rim. */
(function () {
  function compose(){const d={v:1,id:'us-ut-bryce-amphitheatre',view:{lat:37.627,lon:-112.167,heading:91,fov:83,horizon:551},at:'dawn',season:'auto',setting:'natural',signage:false,weather:'live',particles:'season',particleSeasons:{spring:'motes',autumn:'motes'},
    palette:{base:{range:['#9d929f','#bca4ab'],floor:['#bc806a','#d29c7b','#8e655c'],rim:['#b69576','#79664d','#3e4939']},spring:{range:['#9ca5a0','#b1b4a8'],floor:['#bc927d','#d2b394','#8e7968'],rim:['#a7a884','#6d8055','#354e3c']},summer:{range:['#a69b9c','#c1aca9'],floor:['#c58c6b','#dbaa80','#966752'],rim:['#b5a27a','#82734d','#4b5138']},autumn:{range:['#ad929c','#c4a4a4'],floor:['#c47b5b','#d89a71','#995d4e'],rim:['#c39c70','#926d43','#5a4634']},winter:{range:['#adbcc4','#c4cdd1'],floor:['#baa9a6','#d5c6b9','#8f8390'],rim:['#deded0','#aeb7a6','#718176']}},
    sky:{stars:245,clouds:{n:3,y:[90,236],speed:5},sunR:29,moonR:24},layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='far'?{haze:.39}:l.id==='mid'?{haze:.15}:{})),
    ground:[
      {layer:'horizon',d:'M-160 900V559L-28 540 63 521 149 532 251 511 347 524 426 507 505 521 599 507 702 523 796 508 911 521 1011 499 1101 512 1196 491 1291 515 1393 505 1508 526 1624 519 1760 540V900z',fill:'@range.0'},
      {layer:'far',d:'M-160 900V622L-56 608 44 623 147 598 248 612 342 589 446 601 533 584 631 603 718 588 824 600 925 580 1022 599 1116 577 1207 588 1322 574 1417 598 1510 590 1604 612 1760 602V900z',fill:'@range.1'},
      {layer:'mid',d:'M-160 900V693L-38 673 72 688 164 661 266 677 357 652 463 676 557 653 668 682 783 656 895 673 1008 646 1114 671 1221 647 1332 665 1433 639 1555 666 1760 649V900z',fill:'@floor.1'},
      {layer:'near',d:'M-160 900V766Q40 726 199 752L334 714 445 738 574 722 689 765 813 749 932 777 1065 724 1168 742 1318 713 1436 745 1565 717 1760 733V900z',fill:'@floor.0'},
      {layer:'near',d:'M303 900Q426 839 515 817L627 794 698 803 609 828 534 854 486 900zM1008 900L1051 857 1174 818 1230 792 1259 795 1183 836 1112 867 1079 900z',fill:'@floor.2'},
      {layer:'fore',d:'M-160 900V803L-48 785 67 809 178 796 278 829 376 838 452 868 557 886 602 900zM1760 900V789L1652 811 1556 801 1447 826 1359 838 1273 867 1153 892 1094 900z',fill:'@rim.1'},
      {layer:'fore',d:'M-160 815L-47 797 66 820 176 810 276 842 375 850 451 880 487 887 448 877 372 865 276 855 172 822 64 834-47 810-160 829zM1760 803L1651 824 1557 814 1450 839 1360 851 1277 880 1249 882 1267 869 1357 837 1445 825 1555 800 1650 810 1760 790z',fill:'@rim.0'},
      {layer:'front',d:'M-160 900V884Q29 849 189 872T493 900zM1119 900Q1345 860 1503 872T1760 856V900z',fill:'@rim.2'},
    ],place:[
      {obj:'rock.us-bryce-hoodoo',x:809,y:797,s:.88,variant:2,layer:'near',seed:35011,anim:false},
      {obj:'rock.us-bryce-hoodoo',x:654,y:809,s:.61,variant:0,flip:true,layer:'near',seed:35117,anim:false},
      {obj:'rock.us-bryce-hoodoo',x:994,y:824,s:.65,variant:4,layer:'near',seed:35221,anim:false},
      {obj:'rock.us-bryce-fin',x:319,y:759,s:.8,variant:0,layer:'mid',seed:35327,anim:false},
      {obj:'rock.us-bryce-fin',x:1285,y:778,s:.79,variant:1,flip:true,layer:'mid',seed:35437,anim:false},
      {obj:'rock.us-bryce-fin',x:526,y:675,s:.38,variant:2,layer:'far',seed:35543,anim:false},
      {obj:'rock.us-bryce-fin',x:1109,y:667,s:.31,variant:0,layer:'far',seed:35651,anim:false},
      {obj:'tree.us-bristlecone',x:57,y:914,s:.94,variant:2,layer:'front',seed:35759},
      {obj:'tree.us-bristlecone',x:1527,y:909,s:.8,variant:0,flip:true,layer:'front',seed:35869},
      {obj:'tree.us-rim-juniper',x:310,y:873,s:.31,variant:1,layer:'fore',seed:35983},
      {obj:'rock.desert-boulder',x:470,y:883,s:.55,variant:1,layer:'fore',seed:36097},
      {obj:'rock.desert-boulder',x:1187,y:879,s:.47,variant:0,layer:'fore',seed:36203},
      {obj:'rock.desert-boulder',x:1652,y:848,s:.31,variant:2,layer:'fore',seed:36313},
      {obj:'animal.squirrel',x:328,y:870,s:.43,layer:'fore',seed:36427},
    ],scatter:[],actors:[{obj:'animal.squirrel',layer:'fore',path:[[84,886],[271,873],[421,882]],s:.37,speed:9,loop:'pingpong',seed:36539,offset:.2}],flocks:[{obj:'bird.small-flight',layer:'horizon',n:10,area:[137,168,1493,314],s:.43,speed:30,seed:36649},{obj:'bird.us-canyon-raven',layer:'far',n:5,area:[170,363,1435,439],s:.57,speed:21,seed:36761}]};
    d.scatter.push({obj:'rock.us-bryce-hoodoo',layer:'far',seed:36871,area:{rect:[-120,640,1710,697]},n:12,minGap:61,s:[.21,.43],variant:'random',flip:.5,anim:false,shadow:false,tint:{col:'#cfad9f',k:[.09,.23]}});
    d.scatter.push({obj:'rock.us-bryce-hoodoo',layer:'mid',seed:36983,area:{poly:[[-100,690],[506,680],[579,757],[-100,788]]},n:4,minGap:71,s:[.44,.7],variant:'random',flip:.5,anim:false,tint:{col:'#bd8b77',k:[.02,.15]}});
    d.scatter.push({obj:'rock.us-bryce-hoodoo',layer:'mid',seed:37097,area:{poly:[[1117,674],[1700,654],[1700,783],[1057,760]]},n:5,minGap:67,s:[.39,.73],variant:'random',flip:.5,anim:false,tint:{col:'#ba8c82',k:[.07,.2]}});
    for(const [i,area]of [{poly:[[-150,823],[177,835],[380,872],[477,905],[-150,905]]},{poly:[[1268,874],[1497,829],[1750,822],[1750,905],[1161,905]]},{rect:[520,886,1117,909]}].entries()){
      d.scatter.push({obj:{'ground.desert-gravel':3,'ground.desert-tuft':2},layer:'fore',seed:37201+i*127,area,n:i===2?100:180,minGap:9,s:[.32,.8],variant:'random',flip:.5,anim:false,tint:{col:'#aa967a',k:[.04,.19]}});
      d.scatter.push({obj:'ground.desert-tuft',layer:'fore',seed:37607+i*131,area,n:8,minGap:31,s:[.92,1.12],variant:'random',flip:.5,anim:'strip',tint:{col:'#858568',k:[.13,.28]}});
    }
    d.scatter.push({obj:{'tree.us-bristlecone':2,'tree.us-rim-juniper':3},layer:'far',seed:38011,area:{rect:[-110,586,1711,625]},n:22,minGap:43,s:[.08,.18],variant:'random',flip:.5,anim:false,shadow:false,tint:{col:'#899c92',k:[.12,.28]}});
    return d;
  }
  animRegionSceneUpgrade('us','state:UT',{state:'live',landmarks:['rock.us-bryce-hoodoo'],scene:compose});
})();
