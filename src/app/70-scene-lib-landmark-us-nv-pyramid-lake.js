/* Weathered tufa: unequal mineral shelves, porous shoulders, erosion caves.
   Separate native rocks and shore plants, composed over living lake water. */
(function () {
  const {define,poly,ell,f1}=sceneDraw;
  define({id:'rock.us-pyramid-tufa',category:'rock',weight:0,size:[455,395],variants:4,seasonal:false,flippable:true,parts:['body'],reflect:true,shadow:false,
    palette:{base:{stone:['#b9b2a0','#e1d7bd','#817f78','#9d9c8d','#d2c8ae'],hole:['#646b6a','#858a7e']}},tags:['us','pyramid-lake','tufa','natural','signature','landmark','kit:arid','role:rock'],
    build(v,r){const body=[],profiles=[
      [[-220,2],[-190,-38],[-166,-54],[-157,-101],[-135,-119],[-129,-160],[-98,-184],[-91,-227],[-63,-253],[-49,-293],[-20,-319],[-11,-355],[16,-373],[40,-346],[47,-313],[71,-290],[84,-254],[111,-230],[120,-192],[142,-173],[148,-132],[177,-105],[184,-65],[210,-38],[226,5]],
      [[-218,3],[-188,-36],[-175,-86],[-144,-103],[-133,-152],[-103,-178],[-94,-225],[-67,-239],[-53,-287],[-27,-304],[-9,-341],[16,-347],[35,-322],[52,-314],[61,-278],[85,-256],[98,-211],[123,-190],[145,-153],[153,-109],[183,-90],[191,-51],[220,4]],
      [[-218,3],[-186,-27],[-175,-68],[-146,-81],[-130,-132],[-99,-153],[-79,-203],[-60,-219],[-45,-269],[-14,-291],[1,-325],[28,-338],[46,-306],[69,-291],[78,-247],[103,-229],[118,-186],[149,-162],[160,-116],[185,-98],[192,-57],[220,5]],
      [[-219,4],[-184,-38],[-169,-74],[-145,-90],[-128,-133],[-101,-152],[-90,-193],[-62,-207],[-53,-250],[-27,-266],[-13,-306],[13,-318],[32,-294],[50,-277],[65,-235],[94,-220],[108,-177],[140,-156],[157,-107],[182,-82],[190,-40],[223,6]]];
      body.push({f:{lin:[[0,'@stone.1'],[.36,'@stone.4'],[1,'@stone.2']],x1:-76,y1:-360,x2:90,y2:8},d:poly(profiles[v])});
      body.push({f:'@stone.2',op:.68,d:poly(profiles[v].slice(Math.floor(profiles[v].length/2)).concat([[84,5],[60,-37],[74,-77],[49,-112],[61,-148],[34,-189],[40,-225],[19,-263],[22,-304]]))});
      body.push({f:'@stone.0',d:'M-177-13Q-167-63-132-67Q-122-105-91-104Q-77-146-49-139L-39-122Q-70-118-73-82Q-106-78-115-45Q-146-43-151-5z'},
        {f:'@hole.0',op:.62,d:'M-130-30Q-126-64-101-65Q-84-67-80-42L-84-16Q-106-12-130-19zM46-81Q51-106 70-103Q85-100 85-77L79-56Q62-53 46-65z'},
        {f:'@stone.3',d:'M-209-7Q-181-25-157-18L-146-5 105 1 135-20 173-27 215-4 222 8-220 7z'});
      [[-57,175],[-101,139],[-147,116],[-191,88],[-239,57],[-282,35]].forEach(([y,w],i)=>body.push({s:i%2?'@stone.1':'@stone.2',w:3.2-i*.3,op:.58,d:`M${-w} ${y}q${f1(w*.38)} -7 ${f1(w*.69)} -2t${f1(w*.82)} 0`}));
      for(let i=0;i<53;i++){const y=-19-r()*(255-v*9),half=180*(1+y/365),x=(r()-.5)*Math.max(18,half)*1.45,rx=1.6+r()*5.8;body.push({f:i%3?'@hole.1':'@hole.0',op:.25+r()*.32,d:ell(x,y,rx,rx*(.35+r()*.5)),detail:i>22});if(i<19)body.push({s:'@stone.1',w:1,op:.65,d:`M${f1(x-rx)} ${f1(y+2)}q${f1(rx)} 3 ${f1(rx*2)} 0`});}
      for(let i=0;i<15;i++){const y=-25-r()*209,x=(r()-.5)*180,w=8+r()*17;body.push({s:'@stone.1',w:1.2,op:.48,d:`M${f1(x)} ${f1(y)}l${f1(w*.5)} -3 ${f1(w*.5)} 1`,detail:true});}
      return{body};
    }});
  define({id:'plant.us-lake-sagebrush',category:'plant',weight:0,size:[210,135],variants:4,seasonal:true,flippable:true,parts:['stem','leaf'],shadow:{rx:62,ry:5,h:85},
    palette:{base:{stem:['#776e57','#9a8b67'],leaf:['#68796c','#96a08a','#bec3a0']},spring:{leaf:['#678579','#98ad94','#c8cfab']},summer:{leaf:['#788375','#a4ac94','#c6c9a7']},autumn:{leaf:['#86816b','#b6a88a','#d4c49e']},winter:{leaf:['#728c88','#a3b7ad','#d6dcd0']}},anim:{sway:{part:'leaf',pivot:[0,-12],deg:1.4,period:8.3}},tags:['us','great-basin','sagebrush','kit:arid','role:shrub'],
    build(v,r){const stem=[],leaf=[];for(let i=0;i<9;i++){const x=-78+i*19+(r()-.5)*16,y=-44-r()*62;stem.push({s:'@stem.0',w:2.2,d:`M${f1((i-4)*3)} 2Q${f1(x*.5)} -34 ${f1(x)} ${f1(y)}`});for(let j=0;j<6;j++){const xx=x+(r()-.5)*34,yy=y+12-r()*24;leaf.push({f:j%3?'@leaf.0':'@leaf.1',d:poly([[xx-13,yy+5],[xx-9,yy-4],[xx-2,yy-1],[xx+3,yy-9],[xx+10,yy-5],[xx+14,yy+4],[xx+5,yy+7]])},{s:'@leaf.2',w:.8,op:.72,d:`M${f1(xx-6)} ${f1(yy+2)}l5-5m0 5 4-7`,detail:true});}}return{stem,leaf};}
  });
})();
