/* A Sonoran foothill view: Camelback's shoulders, the small city beyond,
   uneven saguaro ages and a dry wash through the warm gravel floor. */
(function () {
  function compose(){const d={v:1,id:'us-phoenix-camelback',view:{lat:33.514,lon:-111.973,heading:248,fov:84,horizon:566},at:'golden',season:'auto',setting:'mixed',signage:false,weather:'live',particles:'season',particleSeasons:{spring:'motes',summer:'motes',autumn:'motes',winter:'motes'},
    palette:{base:{far:['#bca0a0','#a77b6d'],soil:['#c99768','#a87d53','#785b46','#4d4936'],wash:['#d5b78b','#b49971']},spring:{far:['#aca595','#8c8b70'],soil:['#b9a773','#91905c','#636e44','#354b37'],wash:['#d2c39a','#abac80']},summer:{far:['#c0a191','#ab7f65'],soil:['#c3a571','#9b8651','#726b43','#4d5132'],wash:['#dfc191','#b19b6c']},autumn:{far:['#c39b92','#af7b68'],soil:['#cb9865','#a97b4d','#835e40','#554632'],wash:['#dfba87','#b59366']},winter:{far:['#b0b9b4','#8c9d91'],soil:['#b0a68d','#869278','#606f5a','#385345'],wash:['#d1cbb5','#a5af96']}},
    sky:{stars:195,clouds:{n:2,y:[98,216],speed:4},sunR:31,moonR:23},layers:SCENE_LAYERS_DEFAULT,
    ground:[
      {layer:'horizon',d:'M-160 900V571L-24 549 61 517 142 534 224 493 298 514 365 497 434 537 519 550 616 530 715 548 812 538 906 557 1031 533 1131 542 1241 518 1313 538 1415 520 1492 546 1593 537 1760 558V900z',fill:'@far.0'},
      {layer:'far',d:'M-160 900V652Q76 596 279 622T674 630Q861 650 1060 622T1451 631L1760 610V900z',fill:'@far.1'},
      {layer:'mid',d:'M-160 900V724Q99 685 290 707T679 703Q967 672 1184 698T1573 691L1760 709V900z',fill:'@soil.1'},
      {layer:'near',d:'M-160 900V781Q42 720 246 746T623 762Q876 729 1115 759T1539 740L1760 751V900z',fill:'@soil.0'},
      {layer:'fore',d:'M-160 900V837Q127 786 345 832T769 826Q1018 797 1228 833T1760 804V900z',fill:{lin:[[0,'@soil.1'],[1,'@soil.2']],y1:795,y2:900}},
      {layer:'fore',d:'M533 900Q605 846 709 811Q775 793 802 754L821 755Q805 807 738 828Q647 862 621 900z',fill:'@wash.0'},
      {layer:'fore',d:'M551 900Q609 850 724 816L769 785 787 780Q775 809 739 825Q640 862 590 900z',fill:'@wash.1'},
      {layer:'front',d:'M-160 900V872L-24 855 94 868 185 853 271 870 348 871 423 889 476 900zM1261 900L1378 879 1467 882 1541 862 1648 868 1760 847V900z',fill:'@soil.3'},
    ],place:[
      {obj:'rock.us-camelback',x:737,y:692,s:.9,layer:'mid',seed:31013},
      {obj:'plant.us-saguaro',x:913,y:868,s:.78,variant:1,layer:'fore',seed:31121},
      {obj:'plant.us-saguaro',x:139,y:903,s:1.12,variant:3,layer:'front',seed:31231},
      {obj:'plant.us-saguaro',x:1529,y:905,s:1.24,variant:0,flip:true,layer:'front',seed:31337},
      {obj:'plant.us-saguaro',x:1233,y:769,s:.31,variant:2,layer:'near',seed:31447,anim:false},
      {obj:'plant.us-saguaro',x:445,y:752,s:.26,variant:0,flip:true,layer:'near',seed:31559,anim:false},
      {obj:'rock.desert-boulder',x:1140,y:869,s:.68,variant:1,layer:'fore',seed:31667},
      {obj:'rock.desert-boulder',x:343,y:850,s:.54,variant:2,layer:'fore',seed:31769},
      {obj:'animal.rabbit',x:1077,y:829,s:.42,variant:1,layer:'fore',seed:31879},
    ],scatter:[],actors:[{obj:'bird.desert-roadrunner',layer:'fore',path:[[-100,858],[334,842],[525,869],[1026,858],[1730,844]],speed:17,s:.62,loop:'wrap',seed:31991}],flocks:[{obj:'bird.small-flight',layer:'horizon',n:10,area:[70,181,1531,324],s:.42,speed:31,seed:32101},{obj:'bird.small-flight',layer:'far',n:6,area:[192,377,1470,444],s:.51,speed:36,seed:32213}]};
    for(const [i,x]of [1163,1215,1248,1311,1350,1412,1441].entries())d.place.push({obj:'building.tower-glass',x,y:691+(i%3)*4,s:[.2,.29,.24,.38,.27,.23,.18][i],variant:[1,6,3,10,7,13,0][i],layer:'far',seed:32321+i*103,anim:false,tint:{col:'#9b7b66',k:.22}});
    d.scatter.push({obj:{'plant.us-saguaro':1,'plant.desert-ocotillo':2,'plant.desert-creosote':3},layer:'near',seed:33101,area:{rect:[-100,712,1710,781]},n:22,minGap:37,s:[.09,.22],variant:'random',flip:.5,anim:false,tint:{col:'#988c65',k:[.04,.2]}});
    for(const [i,area]of [{poly:[[-160,791],[119,768],[490,822],[545,887],[-160,907]]},{poly:[[854,828],[1114,779],[1760,770],[1760,907],[665,907]]}].entries()){
      d.scatter.push({obj:{'ground.desert-gravel':4,'ground.desert-tuft':2},layer:'fore',seed:33317+i*131,area,n:230,minGap:10,s:[.35,.85],variant:'random',flip:.5,anim:false,tint:{col:'#b69b73',k:[.02,.19]}});
      d.scatter.push({obj:{'plant.desert-creosote':3,'plant.desert-sotol':2},layer:'fore',seed:33601+i*139,area,n:25,minGap:33,s:[.34,.65],variant:'random',flip:.5,anim:false,tint:{col:'#8b8e5f',k:[.02,.16]}});
      d.scatter.push({obj:'ground.desert-tuft',layer:'fore',seed:33901+i*149,area,n:12,minGap:37,s:[.5,.8],variant:'random',flip:.5,anim:'strip',tint:{col:'#99986a',k:[.08,.2]}});
    }
    d.scatter.push({obj:{'ground.desert-gravel':3,'ground.desert-tuft':2},layer:'near',seed:34211,area:{rect:[-140,754,1750,787]},n:95,minGap:15,s:[.17,.38],variant:'random',flip:.5,anim:false,tint:{col:'#b3a184',k:[.12,.25]}});
    return d;
  }
  animRegionSceneUpgrade('us','place:phoenix',{state:'live',landmarks:['rock.us-camelback'],scene:compose});
})();
