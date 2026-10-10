/* North-rim sandstone relief, an inset temple butte and a wind-shaped rim
   juniper. Authored native shapes after the original Grand Canyon opening.
   The cliffs have separate ledges, dipping strata, jointed faces and scree;
   the vegetation belongs to the high rim rather than the low Sonoran desert. */
(function () {
  const {define,poly,ell,f1}=sceneDraw;
  define({id:'bird.us-canyon-raven',category:'bird',weight:0,size:[78,34],variants:2,seasonal:false,flippable:true,parts:['wingFar','body','wings'],palette:{base:{dark:'#242c39',light:'#535b67',edge:'#737b83'}},anim:{flap:{part:'wings',pivot:[0,-2],sy:[.55,1],period:3.9}},tags:['us','raven','flight','kit:birds','kit:arid','role:bird'],
    build(v){return{wingFar:[{f:'@dark',d:'M-5-1Q-17-13-35-14L-40-11-32-10-27-7-20-6-12 1z'}],body:[{f:'@dark',d:'M-21 1L-29-3-33 0-29 5-19 4Q-4 7 14 2L23 0 17-3Q4-7-6-4z'},{f:'@light',op:.45,d:'M-18 1Q-6-3 11-2L13 0Q-5 2-18 1z'},{f:'@dark',d:'M10-3Q17-8 22-5L28-3 21-1 14 0z'}],wings:[{f:'@dark',d:'M-5-2Q7-18 27-25L34-26 31-22 38-23 33-18 39-18 33-13 36-12 25-9Q13-5 5 1z'},{f:'@light',op:.43,d:'M-2-3Q9-15 27-21Q20-12 7-4z'},{s:'@edge',w:.8,op:.6,d:'M5-5Q16-12 28-15'}]};}});
  const crest=[[-920,-93],[-842,-124],[-794,-171],[-753,-181],[-716,-237],[-675,-239],[-639,-283],[-596,-287],[-581,-326],[-532,-331],[-519,-304],[-467,-299],[-440,-264],[-391,-252],[-365,-212],[-305,-197],[-266,-168],[-212,-158],[-184,-190],[-145,-194],[-127,-224],[-88,-229],[-62,-208],[-20,-198],[12,-177],[66,-171],[101,-194],[146,-190],[188,-222],[235,-223],[253,-252],[299,-260],[322,-238],[360,-235],[392,-275],[436,-281],[453,-309],[494,-315],[523,-294],[566,-279],[589,-247],[634,-237],[665,-210],[710,-203],[743,-162],[795,-149],[833,-122],[920,-98]];
  const topAt=x=>{for(let i=1;i<crest.length;i++)if(x<=crest[i][0]){const a=crest[i-1],b=crest[i],t=(x-a[0])/(b[0]-a[0]);return a[1]+t*(b[1]-a[1]);}return crest.at(-1)[1];};
  const palette={base:{rock:['#b97753','#d69c72','#815555','#ae735d','#694b55'],seam:['#e5b78c','#5a4350'],talus:'#a57363'}};
  define({id:'rock.us-grand-canyon-north-wall',category:'rock',weight:0,size:[1840,400],variants:1,seasonal:false,flippable:false,parts:['body'],palette,shadow:false,reflect:false,
    tags:['landmark','signature','natural','us','place:us/state:AZ','kit:arid','role:rock'],
    build(v,r){const body=[];
      const foot=[[920,28],[834,12],[759,37],[672,20],[602,49],[514,24],[435,53],[362,19],[276,38],[194,15],[118,38],[47,10],[-23,31],[-101,17],[-188,43],[-270,21],[-351,48],[-438,25],[-511,54],[-590,30],[-669,41],[-758,12],[-836,31],[-920,8]];
      body.push({f:{lin:[[0,'@rock.1'],[.35,'@rock.0'],[.76,'@rock.2'],[1,'@rock.4']],x1:-400,y1:-330,x2:400,y2:45},d:poly([...crest,...foot])});
      // Geological beds cross neighbouring faces; unequal resistant shelves
      // are cut by branching gullies instead of twelve identical vertical ribs.
      const beds=[[-297,8],[-267,16],[-235,11],[-206,19],[-173,9],[-146,17],[-113,13],[-83,21],[-48,12],[-21,18]];
      beds.forEach(([y,h],i)=>{let run=[];
        const flush=()=>{if(run.length<2){run=[];return;}const bottom=run.map(([x,yy])=>[x,yy+h+Math.sin(x*.014+i)*2]).reverse();body.push({f:i%3===1?'@rock.2':i%3===2?'@rock.1':'@rock.3',op:i%3===1?.42:.6,d:poly([...run,...bottom])});
          body.push({s:'@seam.0',w:i%3===1?2.1:1.2,op:.6,d:'M'+run.map(([x,yy])=>`${f1(x)} ${f1(yy)}`).join('L')});run=[];};
        for(let x=-920;x<=920;x+=16){if(topAt(x)<y-5)run.push([x,y+Math.sin(x*.014+i)*2+Math.sin(x*.041)*1.3]);else flush();}flush();
      });
      const gullies=[
        'M-715-237L-691-201-702-171-674-149-685-112-650-87-660-51-617-10-554 48-624 24-678-12-695-43-710-65-704-99-727-118-716-153-735-177z',
        'M-519-304L-499-280-506-253-475-231-485-201-462-182-471-148-429-124-442-93-406-62-376-12-326 45-393 21-434-26-461-57-471-84-491-105-486-140-511-158-504-190-526-216-518-249-536-273z',
        'M-365-212L-337-190-344-166-312-141-324-113-293-82-302-61-267-37-235 33-276 21-310-9-322-42-347-61-342-96-363-119-351-148-376-174z',
        'M-127-224L-109-207-117-180-88-161-96-133-64-112-74-85-39-65-17-27 47 10 26 35-25 12-57-15-72-44-94-64-88-93-116-113-107-146-135-173z',
        'M188-222L211-202 200-171 231-148 213-114 246-88 234-63 278-38 319 30 275 40 230-1 210-34 189-52 196-86 175-110 186-142 170-168z',
        'M453-309L477-289 463-259 489-232 472-202 505-180 491-150 524-123 506-91 543-62 572-21 633 38 590 49 531 9 507-31 475-54 486-83 458-110 468-140 445-172 458-205 439-232 454-266 439-287z',
        'M665-210L683-195 675-170 702-147 691-119 720-93 710-65 748-40 805 24 768 39 715 4 694-25 672-48 680-81 657-103 668-133 648-158z'
      ];gullies.forEach((d,i)=>body.push({f:i%2?'@rock.4':'@rock.2',op:.55+i%3*.08,d}));
      // Small tributaries diverge at different heights, leaving the bedded
      // faces broad enough to read when the scene is a thumbnail.
      ['M-745-176l40 8 19 19-12 8-21-18-31-10z','M-443-255l-31 22-10 32-9-6 7-32 31-23z','M-263-165l-47 23-9 29-10-8 7-31 53-21z','M-25-165l-41 16-24 30-11-8 24-32 46-13z','M277-190l-46 31-10 34-13-7 11-35 52-32z','M583-226l-67 29-20 40-10-7 16-43 77-26z','M798-154l-80 25-17 30-12-7 14-35 88-22z'].forEach(d=>body.push({f:'@rock.4',op:.46,d}));
      for(let i=0;i<16;i++){const x=-860+i*113+(r()-.5)*43,w=35+r()*60,y=-20-r()*27;
        body.push({f:{lin:[[0,'@rock.0',.7],[1,'@talus',.15]],y1:y,y2:55},d:poly([[x-w-19,y+48],[x-22,y+8],[x-5,y-17],[x+12,y-10],[x+25,y+13],[x+w+28,y+61],[x+3,y+52]])});
        body.push({s:'@rock.4',w:.8,op:.24,detail:true,d:`M${f1(x-4)} ${f1(y+4)}l-16 23m25-18 24 31m-6-7 29 18`});
      }
      return{body};
    }});
  define({id:'rock.us-canyon-temple',category:'rock',weight:0,size:[540,330],variants:3,seasonal:false,flippable:true,parts:['body'],palette,shadow:false,reflect:false,tags:['us','natural','kit:arid','role:rock'],
    build(v,r){const body=[],w=1+v*.09, K=[[-266,2],[-226,-36],[-193,-48],[-172,-111],[-139,-123],[-126,-183],[-87,-193],[-74,-258],[-41,-263],[-31,-319],[10,-325],[24,-293],[57,-285],[70,-239],[112,-223],[129,-157],[162,-144],[180,-88],[220,-63],[269,4]].map(([x,y])=>[x*w,y]);
      body.push({f:{lin:[[0,'@rock.1'],[.5,'@rock.0'],[1,'@rock.2']],x1:-110,y1:-305,x2:200,y2:0},d:poly(K)});
      body.push({f:'@rock.4',op:.57,d:poly([[10,-325],[24,-293],[57,-285],[70,-239],[112,-223],[129,-157],[162,-144],[180,-88],[220,-63],[269,4],[86,3],[39,-66],[13,-149],[-8,-229]])});
      const shelves=[[-126,-183,-86,-193,-58,-170],[-87,-193,-74,-258,-41,-263],[-41,-263,-31,-319,10,-325],[-172,-111,-139,-123,-115,-99],[-193,-48,-172,-111,-147,-88]];
      shelves.forEach(([x,y,a,b,c,d])=>{body.push({f:'@rock.1',op:.7,d:poly([[x*w,y],[a*w,b],[c*w,d],[x*w-7,y+7]])});});
      for(let i=0;i<19;i++){const t=.14+i*.041,y=-310+t*330,half=26+t*210;body.push({s:i%3?'@seam.0':'@rock.4',w:1.1,op:.27,detail:true,d:`M${f1(-half*w)} ${f1(y+6)}q${f1(half*.4)} -4 ${f1(half*.8)} -1m12 4l${f1(half*.55)} 8`});}
      for(let i=0;i<15;i++){const x=-110+r()*225,y=-135+r()*100;body.push({f:i%2?'@talus':'@rock.4',op:.35,detail:true,d:poly([[x,y],[x+9,y-16-r()*19],[x+19,y-4],[x+35,y+12]])});}
      return{body};
    }});
  define({id:'tree.us-rim-juniper',category:'tree',weight:0,size:[380,320],variants:4,seasonal:true,shapeBySeason:true,flippable:true,parts:['trunk','crown'],
    palette:{base:{bark:['#5e4d43','#312e32','#a28b6a'],leaf:['#293e38','#435745','#778166']},spring:{leaf:['#2b4a3c','#496e49','#8b9b6e']},summer:{leaf:['#293f35','#486144','#899269']},autumn:{leaf:['#354439','#5f6545','#a18c60']},winter:{leaf:['#3c4b49','#6d7b71','#b8c0ae']}},
    shadow:{rx:115,ry:10,h:120},reflect:false,anim:{sway:{part:'crown',pivot:[0,-90],deg:.6,period:9.4}},tags:['us','pinyon-juniper','kit:arid','role:tree'],
    build(v,r,ctx){const trunk=[],crown=[],lean=(v-1)*13;
      trunk.push({f:'@bark.1',d:`M-19 5Q-27 -48 -9 -102Q${-32+lean} -153 ${-52+lean} -183L${-43+lean} -187Q${-10+lean} -153 9 -116Q${24+lean} -164 ${65+lean} -189L${72+lean} -181Q${30+lean} -135 22 -97Q8 -42 20 4z`});
      trunk.push({s:'@bark.2',w:4,op:.65,d:`M-8 -3Q-17 -49 -2 -95q-7 -43 ${-26+lean} -72m24 61q14 -48 ${55+lean} -74`});
      const clumps=[[-119,-162,69,31],[-73,-214,83,35],[10,-251,71,43],[91,-226,74,34],[139,-180,55,31],[-13,-178,95,35]];
      clumps.forEach(([cx,cy,rx,ry],i)=>{cx+=lean+(r()-.5)*17;cy+=(r()-.5)*18;rx*=.9+v*.045;
        const pts=Array.from({length:23},(_,j)=>{const a=j*Math.PI*2/23,k=.87+r()*.18;return[cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k];});
        crown.push({f:'@leaf.0',d:poly(pts)});
        crown.push({f:'@leaf.1',d:poly(pts.slice(10,23).concat([[cx+rx*.4,cy+ry*.08],[cx-rx*.7,cy+ry*.22]]))});
        let tips='';for(let j=0;j<16;j++){const x=cx+(r()-.5)*rx*1.55,y=cy-ry*.7+r()*ry;tips+=`M${f1(x-4)} ${f1(y+1)}q3 -5 8 -3l-2 3z`;}
        crown.push({f:'@leaf.2',op:.5,d:tips,detail:true});
        if(ctx.season==='winter')crown.push({f:'#ccd2cb',op:.52,d:`M${f1(cx-rx*.7)} ${f1(cy-ry*.45)}q${f1(rx*.6)} ${f1(-ry*.8)} ${f1(rx*1.25)} ${f1(-ry*.05)}q${f1(-rx*.6)} 3 ${f1(-rx*1.25)} ${f1(ry*.05)}z`});
      });return{trunk,crown};
    }});
})();
