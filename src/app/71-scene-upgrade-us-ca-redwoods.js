/* Draft: offset coast-redwood groves, fern floor and winding soil path.
   The original vertical forest rhythm is retained without embedding it. */
(function () {
  function compose(){
    const d={v:1,id:'us-ca-redwoods',view:{lat:41.3,lon:-124.02,heading:75,fov:78,horizon:540},at:'morning',season:'auto',setting:'natural',weather:'live',particles:'season',
      palette:{base:{hill:['#839d8c','#5a7964'],soil:['#566448','#354d36','#273e2f'],path:['#a18b66','#6b654a']},spring:{soil:['#62764c','#455e3b','#304d35']},summer:{soil:['#617248','#435636','#2c442e']},autumn:{soil:['#8a7950','#605334','#433e2b'],path:['#ae956b','#7d6749']},winter:{soil:['#64756a','#435e52','#2e493f'],path:['#8e9c8b','#5d7264']}},
      layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l)),sky:{stars:130,clouds:{n:3,y:[65,235],speed:3},sunR:23,moonR:20},
      ground:[{layer:'horizon',d:'M-160-30H676Q640 12 615 55Q518 110 386 61T112 75T-160 92ZM1054-30H1760V74Q1647 37 1518 84T1260 62Q1166 118 1098 72Z',fill:'@soil.1'},
        {layer:'horizon',d:'M-160 495Q285 410 650 479T1760 450V900H-160Z',fill:'@hill.0'},
        {layer:'far',d:'M-160 606Q370 508 710 557T1760 533V900H-160Z',fill:'@hill.1'},
        {layer:'mid',d:'M-160 651Q247 596 650 633T1760 590V900H-160Z',fill:'@soil.0'},
        {layer:'near',d:'M-160 739Q272 668 628 715T1760 667V900H-160Z',fill:'@soil.1'},
        {layer:'fore',d:'M-160 859Q203 767 495 823T1051 799T1760 772V900H-160Z',fill:'@soil.2'},
        {layer:'near',d:'M765 595Q1020 656 851 724T1092 900H829Q706 810 751 744T765 595Z',fill:{lin:[[0,'@path.1'],[1,'@path.0']],y1:595,y2:900}}],water:[],place:[],scatter:[],actors:[],flocks:[],camera:{pan:0,period:90}};
    [[-89,907,.85,2,'front'],[1554,919,.85,1,'front'],[367,780,.8,1,'near'],[1187,733,.8,2,'mid'],[89,685,.6,2,'mid'],[1428,667,.8,0,'mid'],[624,636,.6,3,'far'],[1059,605,.6,1,'far'],[230,590,.6,0,'far'],[1310,578,.6,2,'far'],[-100,553,.4,0,'horizon'],[32,536,.4,1,'horizon'],[157,555,.6,2,'horizon'],[342,545,.4,3,'horizon'],[425,563,.6,0,'horizon'],[561,535,.4,1,'horizon'],[694,551,.4,3,'horizon'],[1004,548,.4,0,'horizon'],[1118,531,.6,2,'horizon'],[1237,555,.4,1,'horizon'],[1478,545,.6,3,'horizon'],[1592,565,.4,0,'horizon'],[1740,547,.6,1,'horizon']].forEach((q,i)=>d.place.push({obj:'tree.us-coast-redwood',x:q[0],y:q[1],s:q[2],variant:q[3],layer:q[4],seed:103+i*67,flip:i%2===0,anim:q[4]==='horizon'||q[4]==='front'?false:undefined,tint:['#a8b6bb',q[3]%2?.16:.08]}));
    d.scatter.push({obj:'tree.us-redwood-snag',layer:'horizon',seed:193,area:{poly:[[-140,528],[700,522],[694,565],[-140,570]]},n:9,minGap:83,s:[.3,.6],variant:[0,1],flip:.5,anim:false,tint:{col:'#a5bca9',k:[.3,.3]}});
    d.place.push({obj:'ground.us-redwood-sky-pool',x:853,y:852,s:.85,layer:'fore',seed:1703,shadow:false});
    const banks=[{poly:[[-160,677],[710,677],[746,773],[834,905],[-160,905]]},{poly:[[1050,670],[1760,640],[1760,905],[1110,905],[899,768]]}];
    banks.forEach((area,i)=>{
      d.scatter.push({obj:{'plant.us-sword-fern':4,'ground.leaves':.5,'ground.log':.3,'rock.stones':.4,'rock.boulder':.3,'plant.grass':2},layer:'fore',seed:701+i*211,area,n:255,minGap:10,s:[.31,.68],variant:[0,1],flip:.5,anim:false,tint:{col:'#918164',k:[.08+i*.06,.08+i*.06]}});
      d.scatter.push({obj:{'plant.us-sword-fern':3,'plant.grass':2},layer:'near',seed:1201+i*131,area,n:26,minGap:36,s:[.5,1],variant:[0,1],flip:.5,anim:'strip',tint:{col:'#918164',k:[.08+i*.06,.08+i*.06]}});
    });
    d.place.push({obj:'animal.squirrel',x:528,y:788,s:.85,layer:'near',seed:2701},{obj:'animal.rabbit',x:1294,y:749,s:.67,layer:'near',seed:2801},{obj:'bird.robin',x:215,y:795,s:.7,layer:'fore',seed:2901});
    d.flocks.push({obj:'bird.goose-flight',n:7,area:[170,160,1450,415],speed:21,s:.34,seed:3011,layer:'far'},{obj:'animal.butterfly',n:6,area:[310,635,1420,790],speed:8,s:.55,seed:3101,layer:'near'});
    return d;
  }
  animRegionSceneUpgrade('us','state:CA',{state:'live',landmarks:['tree.us-coast-redwood'],scene:compose});
})();




