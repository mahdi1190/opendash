/* Coast redwood: a native branching crown, fibrous furrows and flared roots.
   The original immense russet trunks are retained as objects, with no
   whole-scene SVG or borrowed background. */
(function () {
  const D=sceneD,F=n=>Math.round(n*10)/10;
  const compact=a=>{const out=[],by=new Map();for(const sh of a){const k=JSON.stringify([sh.f,sh.s,sh.w,sh.op,sh.detail,sh.cap,sh.m]);if(by.has(k))by.get(k).d+=sh.d;else{const q=Object.assign({},sh);out.push(q);by.set(k,q);}}return out;};
  sceneObjDefine({id:'tree.us-coast-redwood',category:'tree',weight:0,size:[350,1120],variants:4,seasonal:true,flippable:true,
    parts:['body','crown','lit'],palette:{base:{bark:['#744432','#a46446','#4c322c','#bc7f55'],leaf:['#244c3d','#38634a','#537953']},
      spring:{bark:['#724432','#a06345','#49332b','#b87b53'],leaf:['#2c5945','#477552','#6c8c60']},
      summer:{bark:['#85513a','#b97850','#58392c','#cf9060'],leaf:['#244d39','#3d6444','#5b7d51']},
      autumn:{bark:['#986441','#ca8a57','#664530','#dea06a'],leaf:['#465f41','#677b50','#8c925d']},
      winter:{bark:['#57413b','#806252','#382f2e','#9a7965'],leaf:['#2c4641','#435d50','#617568']}},
    anim:{sway:{part:'crown',pivot:[0,-760],deg:.22,period:7}},shadow:{rx:110,ry:14,h:1000},
    tags:['landmark','signature','place:us/state:CA','us','us-pacific','coast-redwood','evergreen','kit:temperate','role:tree'],
    build(v,r){
      const body=[],crown=[],lit=[],put=(f,d,op)=>body.push({f,d,op}),stroke=(s,w,d,op)=>body.push({s,w,d,op,cap:'round',detail:true}),lean=(v-1.5)*9;
      put('@bark.2',`M-142 6Q-83-30-73-130L${-42+lean}-1000Q0-1038 ${42+lean}-1000L70-138Q88-43 151 6Z`);
      put('@bark.0',`M-113 0Q-67-30-60-141L${-33+lean}-1007L${26+lean}-1007L48-149Q55-56 100-2Z`);
      put('@bark.1',`M-59-10Q-37-100-31-250L${-18+lean}-1008L${5+lean}-1008L12-176Q8-75 45-8Z`,.86);
      put('@bark.3',`M-53-18Q-29-154-23-340L${-15+lean}-998L${-7+lean}-998L-12-326Q-12-131 6-10Z`,.58);
      for(let i=0;i<54;i++){
        const t=i/53,x=-66+t*132,top=-968+r()*92,y=-32-r()*92,bend=(r()-.5)*15;
        stroke(i%3===0?'@bark.3':'@bark.2',.6+r()*2.2,`M${F(x*.48+lean)} ${F(top)}Q${F(x*.64+bend)} -470 ${F(x)} ${F(y)}`,i%3===0?.36:.65);
        if(i%2===0)stroke('@bark.1',.6,`M${F(x*.7+2)} ${F(-400-r()*280)}q${F(bend)} 80 ${F(-bend*.3)} 147`,.5);
      }
      for(let i=0;i<13;i++){
        const x=-126+i*21,tip=x*1.3+(r()-.5)*15;
        put(i%3?'@bark.0':'@bark.1',D.poly([[x*.27,-138],[x*.54,-73],[tip,3],[tip+9,7],[x*.34,-28]]),.75);
        stroke('@bark.2',1.2,`M${F(x*.32)} -99Q${F(x*.53)} -38 ${F(tip)} 3`,.8);
      }
      for(let j=0;j<9;j++)for(const dir of[-1,1]){
        const y=-760-j*31,span=125-j*8;
        crown.push({s:'@bark.2',w:9-j*.6,d:`M${lean} ${y}Q${dir*span*.6} ${y-22} ${dir*span} ${y-50}`,cap:'round'});
        for(let k=0;k<4;k++){
          const x=dir*(30+k*span*.23),cy=y-30-k*11;
          crown.push({f:'@leaf.'+(j+k)%3,d:sceneDraw.blob(r,x,cy,43-j*2,25+j%3*6,9,.23),detail:k%3!==0||j%3!==0});
          crown.push({s:'@leaf.2',w:.7,d:`M${F(x-15)} ${cy}l23-7m-16 11l19-5`,op:.45,detail:true});
        }
      }
      crown.push({f:'@leaf.0',d:'M-32-1000Q-44-1057-8-1120Q27-1080 37-1011Z'});
      // Height and girth vary independently; the far grove is not one repeated fence.
      const mx=[.77,1.05,.9,1.2][v],my=[.78,.93,1.06,.86][v],M=[mx,0,0,my,0,0],shape=sh=>Object.assign({},sh,{m:M});
      // Cool reflected sky on selected left facets and roots; no invented lamps.
      lit.push({f:'#7897b0',op:.14,d:'M-54-11Q-35-104-27-350L-16-996-8-996-11-328Q-13-102 2-11Z'},
        {s:'#a9c5d3',w:3,op:.14,d:'M-15-104Q-62-18-127 4M-6-118Q46-28 109 3'});
      return{body:compact(body.map(shape)),crown:compact(crown.map(shape)),lit:lit.map(shape)};
    }});
  // A weathered standing snag belongs to the deep grove, rather than a
  // miniature generic broadleaf crown on a bright open horizon.
  sceneObjDefine({id:'tree.us-redwood-snag',category:'tree',weight:0,size:[180,1030],variants:2,seasonal:false,flippable:true,
    palette:{base:{bark:['#686a59','#9a9c7b','#414e44'],moss:'#587157'}},shadow:{rx:70,ry:8,h:970},
    tags:['us','coast-redwood','snag','kit:temperate','role:tree'],build(v,r){const body=[['@bark.2','M-86 3Q-41-40-31-146L-20-1000-8-1030 8-987 25-1009 23-173Q37-56 87 4Z'],['@bark.0','M-57-4Q-25-89-19-249L-11-1008 3-987 5-234Q3-96 36-1Z']];
      for(let i=0;i<22;i++){const x=-26+i*2.4;body.push({s:i%3?'@bark.2':'@bark.1',w:.8,d:`M${F(x*.37)} ${F(-960+r()*100)}Q${F(x*.6)} -470 ${F(x)} -23`,op:.7,detail:true});}
      body.push({s:'@bark.0',w:10,d:'M-18-660l-60-97-20-68M15-777l53-79 11-54',cap:'round'},['@moss','M-25-137Q-34-202-21-289L-14-190-7-114Z',.8]);return{body};}});
  // Sword fern remains green in the wet coast winter; older fronds turn
  // bronze in autumn. A coarse arch survives tiny tiles, pinnules are detail.
  sceneObjDefine({id:'plant.us-sword-fern',category:'plant',weight:0,size:[150,96],variants:3,seasonal:true,flippable:true,
    palette:{base:{leaf:['#326c45','#619556','#244e3a']},spring:{leaf:['#4e8544','#83ad60','#35673e']},summer:{leaf:['#326c45','#619556','#244e3a']},autumn:{leaf:['#767448','#a18d5a','#525d3c']},winter:{leaf:['#3d6554','#6a8970','#2e4c43']}},
    anim:{sway:{part:'body',pivot:[0,0],deg:2,period:4.7}},tags:['us','coast-redwood','sword-fern','kit:temperate','role:ground'],
    build(v,r){const body=[];for(let i=0;i<7;i++){
      const a=(-66+i*22+(r()-.5)*7)*Math.PI/180,L=65+r()*27,ex=Math.sin(a)*L,ey=-Math.cos(a)*L,cx=ex*.25,cy=-L*.94;
      body.push({s:'@leaf.2',w:2,d:`M0 0Q${F(cx)} ${F(cy)} ${F(ex)} ${F(ey)}`},
        {s:'@leaf.'+(i%2),w:4.5,d:`M0-2Q${F(cx)} ${F(cy)} ${F(ex)} ${F(ey)}`,op:.8});
      for(let j=1;j<8;j++){const t=j/8,x=2*(1-t)*t*cx+t*t*ex,y=2*(1-t)*t*cy+t*t*ey,len=(1-t)*14+2;
        body.push({s:'@leaf.'+(j%2),w:2.1,d:`M${F(x-len)} ${F(y-4)}L${F(x)} ${F(y)}l${F(len)} -4`,detail:true});}
    }return{body:compact(body)};}});
  sceneObjDefine({id:'ground.us-redwood-sky-pool',category:'ground',weight:0,size:[640,210],variants:1,seasonal:false,flippable:false,parts:['body','lit'],tags:['us','forest','moonlight','kit:temperate','role:ground'],
    build(){return{body:[],lit:[{f:{rad:[[0,'#83abc2',.23],[.55,'#7195a8',.1],[1,'#7195a8',0]],cx:0,cy:-70,r:300},d:sceneD.ell(0,-60,320,92)}]};}});
})();
