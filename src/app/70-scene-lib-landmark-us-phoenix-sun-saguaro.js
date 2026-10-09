/* Camelback's two shoulders and ribbed, weather-scarred Sonoran saguaros.
   Original silhouette ideas rebuilt as separate native geology and plants. */
(function () {
  const {define,poly,ell,f1}=sceneDraw;
  define({id:'rock.us-camelback',category:'rock',weight:0,size:[1150,330],variants:1,seasonal:false,flippable:false,parts:['body'],shadow:false,
    palette:{base:{rock:['#ac7257','#d79b72','#77544d','#9c6854','#dfb28c'],seam:'#664b48'}},tags:['us','phoenix','camelback','natural','landmark','signature','kit:arid','role:rock'],
    build(v,r){const body=[],edge=[[-575,3],[-530,-38],[-498,-78],[-450,-106],[-426,-144],[-380,-160],[-353,-196],[-300,-208],[-279,-245],[-238,-260],[-211,-297],[-168,-316],[-125,-308],[-94,-278],[-62,-265],[-36,-238],[4,-243],[32,-267],[71,-289],[111,-285],[148,-260],[183,-243],[214,-211],[256,-195],[290,-159],[330,-143],[366,-110],[413,-91],[458,-57],[511,-35],[575,8]];
      body.push({f:{lin:[[0,'@rock.4'],[.4,'@rock.0'],[1,'@rock.2']],x1:-160,y1:-315,x2:210,y2:12},d:poly(edge)});
      body.push({f:'@rock.2',op:.7,d:'M-168-316L-125-308-94-278-62-265-36-238 4-243 32-267 71-289 81-263 57-227 76-189 43-159 68-120 11-65-27 8-189 5-158-55-181-92-159-143-187-179-166-221-181-259z'},
        {f:'@rock.3',d:'M111-285L148-260 183-243 214-211 256-195 290-159 330-143 366-110 413-91 458-57 511-35 575 8 274 7 248-42 218-71 211-103 177-125 182-163 143-191 148-229z'},
        {f:'@rock.1',op:.65,d:'M-279-245L-238-260-211-297-222-265-250-230-255-201-300-173-329-126-359-99-398-40-440 3-497 4-455-46-421-83-404-124-357-163-336-195-296-215z'});
      const cuts=['M-352-194l28 31-12 34 29 30-13 29 42 44 31 34-51-20-41-34-13-29-19-17 12-37-17-31z','M-68-260l23 37-12 33 22 37-16 30 26 41-29 36-40 46 27-54 15-28-22-43 12-33-21-35 12-31z','M199-225l22 36-12 33 27 35-8 26 36 48 22 38-38-29-26-35-16-34 8-28-25-26 9-34-18-25z'];
      cuts.forEach(d=>body.push({f:'@seam',op:.48,d}));
      for(let i=0;i<41;i++){const x=-374+r()*729,y=-27-r()*146,w=10+r()*37;body.push({s:i%3?'@rock.4':'@seam',w:.9+r()*.8,op:.27+r()*.2,detail:i>17,d:`M${f1(x)} ${f1(y)}l${f1(w*.6)} ${f1(-3-r()*5)} ${f1(w*.4)} ${f1(4+r()*4)}`});}
      for(let i=0;i<44;i++){const x=-298+r()*601,y=-23-r()*125,w=2+r()*6;body.push({f:i%2?'@rock.1':'@rock.2',op:.32,detail:true,d:poly([[x-w,y],[x,y-w*.7],[x+w,y+1],[x+1,y+w*.4]])});}
      return{body};
    }});
  define({id:'plant.us-saguaro',category:'plant',weight:0,size:[245,510],variants:4,seasonal:true,shapeBySeason:true,flippable:true,parts:['body'],shadow:{rx:40,ry:6,h:310},
    palette:{base:{skin:['#344d35','#69814a','#223b2f'],rib:['#91a76c','#283f30'],scar:['#9a8b62','#4c513a'],flower:'#eee9cd'},spring:{skin:['#35563a','#769853','#284a37'],rib:['#adc47b','#2f4c34']},summer:{skin:['#3c5132','#7b8749','#2a3e2b'],rib:['#a6b06a','#344832']},autumn:{skin:['#4c5738','#87904e','#344634']},winter:{skin:['#3c5d49','#789578','#2a4e3c'],rib:['#aac1a0','#395845']}},anim:{sway:{part:'body',pivot:[0,-20],deg:.12,period:18.7}},tags:['us','saguaro','sonoran','kit:arid','role:tree'],
    build(v,r,ctx){const body=[],h=450+v*16,l=-88-v*4,ly=-230-v*27,ry=-300+v*21;
      body.push({f:{lin:[[0,'@skin.2'],[.35,'@skin.0'],[.7,'@skin.1'],[1,'@skin.0']],x1:-24,y1:-h,x2:25,y2:-h},d:`M-25 3L-23 ${-h+28}Q-22 ${-h} 0 ${-h}Q24 ${-h+1} 25 ${-h+29}L27 3z`});
      body.push({s:'@skin.0',w:34,cap:'round',d:`M-17 -174Q${l} -171 ${l} -229V${ly-54}`},{s:'@skin.1',w:11,cap:'round',op:.6,d:`M-16 -178Q${l+7} -180 ${l+7} -230V${ly-53}`},
        {s:'@skin.0',w:31,cap:'round',d:`M17 ${ry+67}Q96 ${ry+68} 96 ${ry+12}V${ry-46}`},{s:'@skin.1',w:9,cap:'round',op:.58,d:`M20 ${ry+61}Q101 ${ry+61} 101 ${ry+11}V${ry-45}`});
      for(let i=0;i<8;i++){const x=-19+i*5.2;body.push({s:i%2?'@rib.0':'@rib.1',w:i%2?1.8:1.3,op:.58,d:`M${f1(x)} ${-h+24+Math.abs(i-3.5)*2}Q${f1(x-2)} -221 ${f1(x+1)} -3`});}
      for(const [x,y,hh]of [[l,ly-48,-204],[96,ry-39,ry+22]])for(let i=0;i<3;i++)body.push({s:i%2?'@rib.0':'@rib.1',w:1.2,op:.65,d:`M${x-7+i*6} ${y}V${hh}`});
      for(let i=0;i<29;i++){const y=-22-r()*(h-68),x=-17+r()*33;body.push({s:'@rib.0',w:.65,op:.6,detail:true,d:`M${f1(x)} ${f1(y)}l-2-2m2 2 2-2m-2 2v-3`});}
      body.push({f:'@scar.1',d:ell(5,-155-v*20,6,12)},{s:'@scar.0',w:1.6,op:.8,d:`M-11 ${-102-v*23}q8-7 9-19m-4-9q-7-10-6-18`});
      if(ctx.season==='spring')for(const [x,y]of [[0,-h+2],[l,ly-55],[96,ry-48]]){body.push({f:'@skin.2',d:ell(x,y+3,11,4)});for(let i=0;i<5;i++)body.push({f:'@flower',d:ell(x-7+i*3.5,y-2-Math.sin(i*.8)*3,2.5,4)});}
      return{body};
    }});
})();
