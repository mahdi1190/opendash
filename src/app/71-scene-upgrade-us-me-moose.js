/* Maine lighthouse on ledged granite; sea fog and an open Atlantic lead-in. */
(function(){
 const palette={base:{island:['#a3b2b6','#7b9499'],rock:['#87928f','#5e7575','#2a4349'],ground:['#63764f','#425d43','#283f37']},spring:{ground:['#6c8758','#466b46','#294b37']},summer:{ground:['#697f4b','#46603b','#283f2f']},autumn:{ground:['#998354','#715f41','#454532']},winter:{ground:['#b9c7bc','#8fa99c','#5c7d75'],rock:['#a7babc','#7c999c','#3c606b']}};
 function compose(){const d={v:1,id:'us-me-moose',view:{lat:43.623,lon:-70.208,heading:115,horizon:551},at:'dawn',season:'auto',setting:'natural',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.72},{id:'far',depth:.2,haze:.48},{id:'mid',depth:.43,haze:.18},{id:'near',depth:.74,haze:.04},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:200,clouds:{n:4,y:[95,330],speed:3},sunR:26,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V572Q8 541 183 556L342 581 1760 561V900z',fill:'@island.0'},
 {layer:'mid',d:'M419 900L455 788 548 733 628 690 728 666Q888 648 1033 674L1150 717 1338 746 1760 803V900z',fill:'@rock.0'},
 {layer:'near',d:'M434 900L469 811 568 756 686 739 795 693 995 695 1166 758 1760 819V900z',fill:'@rock.1'},
 {layer:'near',d:'M671 679Q805 640 968 666L1040 684Q846 702 671 697z',fill:'@ground.0'},
 {layer:'near',d:'M478 804L564 749 655 723 729 702 805 704 746 727 633 744 567 771zM798 738L858 711 1002 713 1091 744 1031 751 963 731 891 737zM606 801L698 768 791 775 845 795 742 789z',fill:'@rock.0'},
 {layer:'near',d:'M520 792L589 765 682 747 737 733 733 740 638 764zM833 759L908 746 1001 750 1063 771 971 762 893 764z',fill:'@rock.2'},
 {layer:'fore',d:'M-160 900V864L24 830 147 839 286 814 424 842 566 828 709 848 856 818 997 842 1190 822 1388 860 1760 820V900z',fill:'@rock.2'},
 {layer:'front',d:'M-160 900V888L49 857 190 873 342 859 513 900zM1180 900Q1474 858 1760 872V900z',fill:'@ground.2'}],water:[{layer:'far',d:'M-160 570Q800 550 1760 584V900H-160z',y0:590,y1:900,base:['#9fb8c1','#5c879c','#264e67'],reflect:true,shimmer:46,lightPath:true}],place:[
 {obj:'rock.us-maine-islet',x:1415,y:590,s:.87,layer:'far',seed:15001},
 {obj:'ground.us-maine-surf',x:480,y:850,s:1,layer:'near',seed:15005,anim:false},
 {obj:'landmark.us-me-moose',x:780,y:675,s:1,layer:'near',seed:15013,shadow:false},
 {obj:'tree.us-rim-juniper',x:1192,y:766,s:.65,variant:1,layer:'near',seed:15031},{obj:'tree.us-rim-juniper',x:1501,y:835,s:.92,variant:2,layer:'fore',seed:15053},
 {obj:'rock.boulder',x:1153,y:819,s:1.2,variant:2,layer:'fore',seed:15073},{obj:'rock.boulder',x:73,y:886,s:1.25,variant:1,layer:'front',seed:15091},
 {obj:'bird.herring-gull',x:391,y:844,s:.7,variant:1,layer:'fore',seed:15107}],scatter:[],actors:[
 {obj:'boat.us-maine-fishing',path:[[144,638],[334,648],[466,677]],speed:6,s:.33,variant:0,layer:'near',seed:15131,loop:'pingpong'},{obj:'bird.mallard',path:[[268,748],[449,733]],speed:5,s:.41,variant:1,layer:'near',seed:15149,loop:'pingpong'}],flocks:[{obj:'bird.herring-gull-flight',n:13,area:[120,165,1480,382],layer:'horizon',speed:34,s:.4,seed:15161}]};
 d.scatter.push({obj:{'rock.boulder':2,'rock.stones':2,'ground.desert-gravel':1},layer:'fore',seed:15187,area:{poly:[[-160,862],[286,826],[458,851],[718,845],[1050,844],[1437,879],[1760,845],[1760,905],[-160,905]]},n:170,minGap:10,s:[.38,.85],variant:[0,1],flip:.5,anim:false,tint:{col:'#809594',k:[0,.16]}});
 d.scatter.push({obj:{'plant.grass':2,'plant.fern':1,'plant.reed':1,'ground.leaves':1},layer:'fore',seed:15211,area:{poly:[[1059,747],[1760,801],[1760,905],[1288,905]]},n:160,minGap:9,s:[.35,.68],variant:[0,1],flip:.5,anim:false,tint:{col:'#7a8667',k:[0,.16]}});
 d.scatter.push({obj:'plant.grass',layer:'fore',seed:15233,area:{poly:[[-90,879],[253,863],[398,905],[-90,905]]},n:30,minGap:20,s:[.5,.9],variant:'random',flip:.5,anim:'strip'});
 d.scatter.push({obj:{'rock.stones':2,'ground.desert-gravel':2,'plant.grass':1},layer:'near',seed:15251,area:{poly:[[547,745],[705,699],[1033,705],[1169,758],[943,783],[744,764]]},n:85,minGap:13,s:[.24,.48],variant:[0,1],flip:.5,anim:false,tint:{col:'#9eaaa0',k:[0,.16]},reflect:true});return d;}
 animRegionSceneUpgrade('us','state:ME',{state:'live',landmarks:['landmark.us-me-moose'],scene:compose});
})();
