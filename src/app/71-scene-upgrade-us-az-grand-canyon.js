/* A high-rim view into eroded canyon walls and the distant Colorado River.
   Warm stratified geology is the original inspiration; native relief, rim
   junipers, wildlife and real light rebuild the picture on the scene engine. */
(function () {
  const scene=()=>({v:1,id:'us-grand-canyon-rim',view:{lat:36.058,lon:-112.109,heading:330,fov:82,horizon:545,lift:1},
    at:'golden',season:'auto',setting:'natural',signage:false,weather:'live',particles:'season',particleSeasons:{spring:'motes',autumn:'motes'},
    palette:{base:{far:['#b6a4b2','#aa8996'],gorge:['#bd8c73','#895e60','#594651'],rim:['#bc9a78','#8b6d57','#423c38'],wash:'#c9a889'},
      spring:{far:['#a6b0b0','#8d9b9b'],gorge:['#bc9c80','#897365','#57564d'],rim:['#a8a581','#74805b','#37493d']},
      summer:{far:['#b6a5a1','#a88b83'],gorge:['#c39274','#956f5f','#65524f'],rim:['#b0a279','#877b55','#4a493a']},
      autumn:{far:['#b8a0aa','#ab8590'],gorge:['#ca8f6b','#9f6853','#6e4847'],rim:['#ba9470','#8c6748','#4c3934']},
      winter:{far:['#b6c0c9','#9ba6b6'],gorge:['#b6aaa4','#897c86','#56586a'],rim:['#d0d1c8','#a5ada4','#677571'],wash:'#d9d9cf'}},
    sky:{stars:320,clouds:{n:3,y:[65,240],speed:4},sunR:27,moonR:23},
    layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='horizon'?{haze:.72}:l.id==='far'?{haze:.42}:l.id==='mid'?{haze:.18}:l.id==='near'?{haze:.07}:{})),
    ground:[
      {layer:'horizon',d:'M-160 564V508L-36 498 14 466 76 464 99 438 168 437 190 461 251 472 278 490 365 489 399 470 459 468 484 492 578 498 624 476 703 475 739 495 839 502 879 479 961 477 998 450 1060 449 1091 474 1156 487 1204 486 1240 467 1319 463 1351 487 1443 491 1477 477 1568 479 1616 501 1760 516V580H-160z',fill:'@far.0'},
      {layer:'far',d:'M-160 630V566L-39 548 2 527 76 531 118 555 198 554 251 576 338 575 389 553 448 551 494 574 571 573 606 592 679 591 722 565 782 561 831 583 884 579 927 556 987 552 1039 529 1113 528 1144 558 1211 560 1249 581 1328 575 1369 547 1438 551 1489 575 1563 567 1620 585 1760 573V649H-160z',fill:'@far.1'},
      {layer:'mid',d:'M-160 900V663Q400 647 800 665T1760 651V900z',fill:{lin:[[0,'@gorge.0'],[.5,'@gorge.1'],[1,'@gorge.2']],y1:655,y2:900}},
      {layer:'mid',d:'M325 697L479 708 595 734 734 744 781 758 740 762 595 749 452 724zM1256 696L1141 710 1043 733 939 759 858 774 848 765 936 746 1032 721 1120 705zM493 760L590 766 663 782 753 789 791 802 776 806 693 793 604 784z',fill:'@gorge.0'},
      {layer:'mid',d:'M567 705L623 716 686 721 773 750 760 755 681 731 616 727zM1198 714L1128 737 1024 753 942 779 925 777 1015 744 1117 728zM397 745L471 758 527 776 653 791 649 797 519 784 455 768z',fill:'@gorge.1'},
      {layer:'near',d:'M-160 900V690L18 672 91 705 203 715 271 750 392 759 451 784 581 792 645 816 719 839 771 856 823 880 867 891 933 874 1007 811 1090 799 1174 763 1280 749 1361 703 1484 679 1580 671 1760 684V900z',fill:'@gorge.2'},
      {layer:'near',d:'M854 701Q823 714 827 730Q829 741 847 750Q863 759 828 770Q805 781 809 793Q815 808 855 820Q872 826 865 841Q862 853 882 876L929 916 971 914 904 866Q891 851 899 837Q903 819 876 810Q839 797 840 789Q840 783 859 777Q884 766 881 754Q878 743 858 733Q848 724 861 712z',fill:'@gorge.1'},
      {layer:'fore',d:'M-160 900V776Q-51 739 60 778L178 787 257 812Q349 808 420 830L543 845 617 866 708 900zM1760 900V753L1634 769 1572 794Q1488 791 1429 819L1325 826 1254 856 1158 866 1091 900z',fill:{lin:[[0,'@rim.0'],[.35,'@rim.1'],[1,'@rim.2']],y1:760,y2:900}},
      {layer:'fore',d:'M-160 900V886Q120 870 350 887T750 883Q950 866 1130 885T1510 878L1760 887V900z',fill:'@rim.2'},
      {layer:'front',d:'M-160 900V860L-48 844 73 867 187 860 294 883 419 881 518 900zM1760 900V846L1654 852 1573 869 1476 865 1362 884 1270 886 1191 900z',fill:'@rim.2'},
      {layer:'fore',d:'M-160 782L-38 754 59 788 176 799 255 825 326 825 411 842 480 845 501 853 420 852 326 835 253 836 176 811 59 800-35 766-160 793zM1760 766L1634 781 1571 808 1486 804 1425 832 1325 838 1271 861 1255 856 1317 826 1425 819 1485 793 1570 794 1634 769 1760 753z',fill:'@wash'}
    ],
    water:[{layer:'near',d:'M854 708Q831 717 834 730Q836 740 853 748Q873 760 837 773Q815 782 816 791Q821 804 861 816Q885 825 877 842Q870 857 892 877L943 916 962 914 898 871Q883 854 891 840Q899 822 870 813Q833 800 833 790Q832 782 852 775Q880 766 874 754Q869 743 852 734Q841 724 858 710z',y0:708,y1:916,base:['#91a28b','#6d8c7b','#486e69'],reflect:true,shimmer:21,lightPath:true}],
    place:[
      {obj:'rock.us-grand-canyon-north-wall',x:800,y:686,s:1,layer:'mid',seed:15013,anim:false,reflect:true},
      {obj:'rock.us-canyon-temple',x:1090,y:758,s:.65,variant:1,layer:'near',seed:15131,anim:false},
      {obj:'rock.us-canyon-temple',x:315,y:731,s:.5,variant:2,flip:true,layer:'near',seed:15241,anim:false,tint:{col:'#a87575',k:.2}},
      {obj:'tree.us-rim-juniper',x:84,y:904,s:1.08,variant:0,layer:'front',seed:15349},
      {obj:'tree.us-rim-juniper',x:1546,y:905,s:.89,variant:3,flip:true,layer:'front',seed:15461},
      {obj:'rock.desert-boulder',x:265,y:862,s:.8,variant:2,layer:'fore',seed:15581},
      {obj:'rock.desert-boulder',x:1414,y:866,s:.7,variant:1,flip:true,layer:'fore',seed:15683},
      {obj:'animal.squirrel',x:284,y:852,s:.55,layer:'fore',seed:15791},
      {obj:'animal.rabbit',x:1355,y:845,s:.45,variant:1,layer:'fore',seed:15901}
    ],
    scatter:[
      {obj:{'tree.us-rim-juniper':3,'tree.far-pine':1},layer:'far',seed:16007,area:{rect:[-90,542,1690,560]},n:23,minGap:59,s:[.08,.13],variant:[0,3],flip:.5,anim:false,shadow:false,tint:{col:'#9d999a',k:[.15,.4]}},
      {obj:{'ground.desert-gravel':5,'ground.desert-tuft':2},layer:'fore',seed:16127,area:{poly:[[-80,805],[130,821],[329,855],[520,884],[565,900],[-80,900]]},n:220,minGap:8,s:[.27,.8],variant:[0,3],flip:.5,anim:false,tint:{col:'#99836b',k:[0,.2]}},
      {obj:{'ground.desert-gravel':5,'ground.desert-tuft':2},layer:'fore',seed:16253,area:{poly:[[1270,864],[1470,829],[1700,789],[1700,900],[1190,900]]},n:230,minGap:8,s:[.3,.9],variant:[0,3],flip:.5,anim:false,tint:{col:'#a38b6c',k:[0,.18]}},
      {obj:{'ground.desert-gravel':4,'ground.desert-tuft':2},layer:'fore',seed:16303,area:{rect:[580,884,1120,900]},n:100,minGap:7,s:[.3,.65],variant:[0,3],flip:.5,anim:false,tint:{col:'#827365',k:[.05,.25]}},
      {obj:'ground.desert-tuft',layer:'fore',seed:16361,area:{rect:[-70,876,1670,902]},n:46,minGap:22,s:[.4,.8],variant:[0,3],flip:.5,anim:'strip',mask:{avoid:[{rect:[590,860,1140,920]}]}},
    ],
    actors:[{obj:'animal.squirrel',layer:'fore',path:[[162,856],[310,859],[386,877]],s:.42,speed:12,loop:'pingpong',offset:.2,seed:16603}],
    flocks:[{obj:'bird.small-flight',layer:'horizon',n:10,area:[180,147,1450,299],s:.47,speed:29,seed:16729},{obj:'bird.us-canyon-raven',layer:'far',n:6,area:[280,405,1350,497],s:.63,speed:18,seed:16843}],
    camera:{pan:0,period:109}
  });
  animRegionSceneUpgrade('us','state:AZ',{state:'live',landmarks:['rock.us-grand-canyon-north-wall'],scene});
})();
