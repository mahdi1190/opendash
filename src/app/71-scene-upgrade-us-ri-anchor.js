/* Coastal mansion, terrace garden and unequal sailing boats on Narragansett Bay. */
(function(){
 const palette={base:{hill:['#9eafb0','#748f8a'],ground:['#8c9c69','#5f7c52','#304e3c'],rock:['#a79b88','#6f7b78','#475e5a']},spring:{ground:['#95ae71','#668f57','#335c42']},summer:{ground:['#8ba266','#597e4b','#2d5139']},autumn:{ground:['#ad965c','#806b43','#514a34']},winter:{ground:['#ced9d2','#a7bfb0','#6e9082']}};
 function compose(){const d={v:1,id:'us-ri-anchor',view:{lat:41.464,lon:-71.306,heading:220,horizon:542},at:'golden',season:'auto',setting:'mixed',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.65},{id:'far',depth:.2,haze:.4},{id:'mid',depth:.42,haze:.15},{id:'near',depth:.74,haze:.03},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:190,clouds:{n:4,y:[70,285],speed:4},sunR:26,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V555Q159 505 378 543T898 533Q1247 487 1760 544V900z',fill:'@hill.0'},
 {layer:'far',d:'M-160 900V599Q128 555 376 577L554 607 1760 575V900z',fill:'@hill.1'},
 {layer:'mid',d:'M589 900L627 691 709 659Q938 626 1136 652L1760 700V900z',fill:'@rock.0'},
 {layer:'near',d:'M625 900L655 721 751 694Q1004 659 1184 687L1760 742V900z',fill:'@rock.1'},
 {layer:'near',d:'M627 690L666 658Q961 631 1206 665L1760 695V718Q1432 697 1179 692T627 712z',fill:'@ground.0'},
 {layer:'fore',d:'M-160 900V879Q175 837 420 861L661 818Q1073 739 1760 806V900z',fill:'@ground.1'},
 {layer:'fore',d:'M642 900Q857 781 1093 729L1318 715 1380 736Q1048 761 802 900z',fill:'#c9bc9d'},
 {layer:'front',d:'M-160 900V900L211 855Q357 845 549 900zM1208 900Q1465 837 1760 847V900z',fill:'@ground.2'}],water:[{layer:'near',d:'M-160 587Q256 574 619 606L676 651 627 691 611 758 589 821 420 861 397 900H-160z',y0:666,y1:900,base:['#a5c5c5','#578f9b','#285a73'],reflect:true,shimmer:43,lightPath:true}],place:[
 {obj:'landmark.us-ri-anchor',x:900,y:666,s:.95,layer:'near',seed:14009},
 {obj:'tree.us-northern-maple',x:1541,y:918,s:1.02,variant:3,layer:'front',seed:14029},{obj:'tree.us-northern-maple',x:1384,y:702,s:.42,variant:2,layer:'near',seed:14047},
 {obj:'plant.reed',x:74,y:902,s:1.2,variant:2,layer:'front',seed:14071},
 {obj:'street.lamppost',x:1137,y:763,s:.47,variant:1,layer:'fore',seed:14087},{obj:'street.bench',x:1460,y:781,s:.65,variant:1,layer:'fore',seed:14107}],scatter:[],actors:[
 {obj:'boat.us-newport-sloop',path:[[145,689],[420,720],[570,745]],speed:8,s:.62,variant:0,layer:'near',seed:14129,loop:'pingpong'},{obj:'boat.us-newport-sloop',path:[[465,643],[345,636],[117,652]],speed:6,s:.29,variant:2,layer:'near',seed:14143,loop:'pingpong'},{obj:'boat.us-newport-sloop',path:[[33,807],[345,788]],speed:7,s:.85,variant:1,layer:'fore',seed:14159,loop:'pingpong'}],flocks:[{obj:'bird.herring-gull-flight',n:13,area:[120,165,1480,366],layer:'horizon',speed:32,s:.39,seed:14173}]};
 for(const[i,poly]of [[[[-160,871],[396,848],[552,905],[-160,905]],140],[ [[760,821],[1760,779],[1760,905],[802,905]],200]].entries())d.scatter.push({obj:{'plant.grass':3,'plant.wildflowers':2,'rock.stones':1,'ground.leaves':1,'ground.puddle':1},layer:'fore',seed:14207+i*47,area:{poly:poly[0]},n:poly[1],minGap:9,s:[.36,.75],variant:[0,1],flip:.5,anim:false,tint:{col:'#bdad7c',k:[0,.16]}});
 d.scatter.push({obj:'plant.grass',layer:'fore',seed:14311,area:{poly:[[1240,836],[1760,792],[1760,905],[1208,905]]},n:35,minGap:24,s:[.55,1],variant:'random',flip:.5,anim:'strip'});
 d.scatter.push({obj:{'rock.boulder':2,'rock.stones':1},layer:'near',seed:14327,area:{poly:[[627,717],[705,689],[1020,711],[1177,752],[858,797],[664,835]]},n:37,minGap:27,s:[.45,.8],variant:[0,1],flip:.5,anim:false,tint:{col:'#9ca19a',k:[0,.16]},reflect:true});return d;}
 animRegionSceneUpgrade('us','state:RI',{state:'live',landmarks:['landmark.us-ri-anchor'],scene:compose});
})();
