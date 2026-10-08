/* Austin's pink granite Capitol: spreading wings, rusticated base, arched
   openings, columned drum and a ribbed dome. Architecture without inscriptions,
   flags or the rooftop figure. Native geometry and individually lit panes. */
(function () {
  if (typeof sceneDraw === 'undefined') return;
  const { define, rect, ell, poly, f1:F } = sceneDraw;
  define({
    id:'landmark.texas-capitol',category:'landmark',size:[880,438],variants:1,
    seasonal:false,flippable:false,parts:['body','lit'],
    palette:{base:{stone:['#c99583','#e4b8a1','#9c716a','#f3d2b6'],glass:'#354b50',dome:['#9d8070','#c4a58b','#715f59']}},
    night:{glow:{window:'#ffd6a0',dome:'#e6caa8'},on:.94},
    shadow:{rx:130,ry:9,h:100},
    tags:['landmark','place:texas/place:austin','texas','austin','capitol','pink-granite','kit:urban','role:landmark'],
    build() {
      const body=[],lit=[];
      const fill=(f,d,extra)=>body.push(Object.assign({f,d},extra));
      const line=(s,w,d,extra)=>body.push(Object.assign({s,w,d},extra));
      const window=(x,y,w,h,arch,litOn)=>{
        const frame=arch?`M${F(x-2)} ${F(y+h+2)}V${F(y+6)}q${F(w/2+2)} -14 ${F(w+4)} 0V${F(y+h+2)}z`:rect(x-3,y-3,w+6,h+6);
        fill('@stone.2',frame);
        const d=arch?`M${F(x)} ${F(y+h)}V${F(y+7)}q${F(w/2)} -11 ${F(w)} 0V${F(y+h)}z`:rect(x,y,w,h);
        fill('@glass',d);
        if(litOn){
          const mx=x+w/2, my=y+h*.56, top=y+7;
          const pane=arch?`M${F(x+1)} ${F(my-1)}V${F(top)}Q${F(x+w*.23)} ${F(y+1)} ${F(mx-1)} ${F(y+1)}V${F(my-1)}zM${F(mx+1)} ${F(y+1)}Q${F(x+w*.77)} ${F(y+1)} ${F(x+w-1)} ${F(top)}V${F(my-1)}H${F(mx+1)}z`:rect(x+1,y+1,w/2-2,h*.56-2)+rect(mx+1,y+1,w/2-2,h*.56-2);
          fill('@glass',pane+rect(x+1,my+1,w/2-2,h*.44-2)+rect(mx+1,my+1,w/2-2,h*.44-2),{glow:'window'});
        }
        // Each glow pane stays behind its sash and stone sill.
        line('@stone.1',1.5,`M${F(x+w/2)} ${F(y+2)}v${F(h-2)}M${F(x)} ${F(y+h*.56)}h${w}`);
        fill('@stone.1',rect(x-4,y+h+2,w+8,3));
      };
      // The long wings: warm lit-side courses, cool recessed inner bays.
      for(const side of [-1,1]) {
        const x=side<0?-427:148;
        fill('@stone.0',rect(x,-151,279,127));
        fill('@stone.2',rect(x+256,-148,23,124));
        fill('@stone.1',rect(x-4,-158,287,9));
        fill('@stone.3',rect(x-7,-161,293,3));
        fill('@stone.2',rect(x-5,-29,289,7));
        for(let k=0;k<5;k++)line('@stone.2',1,`M${x} ${-50-k*19}h279`,{op:.35,detail:true});
        for(let k=0;k<10;k++) {
          const xx=x+11+k*26;
          window(xx,-130,14,31,true,k%3!==1);
          window(xx,-77,14,32,false,k%4!==2);
          fill('@stone.1',rect(xx-4,-143,22,3));
        }
        // End pavilion with a pediment, layered cornices and pilasters.
        const px=side<0?-427:353;
        fill('@stone.0',rect(px-3,-179,80,155));
        fill('@stone.2',rect(px+65,-174,12,150));
        fill('@stone.1',poly([[px-8,-180],[px+37,-206],[px+82,-180]]));
        fill('@stone.2',poly([[px+3,-182],[px+37,-199],[px+71,-182]]));
        fill('@stone.3',rect(px-8,-180,90,5));
        for(let k=0;k<3;k++) {window(px+8+k*23,-155,12,32,true,k!==1);window(px+8+k*23,-96,12,34,false,k!==2);}
        for(let k=0;k<4;k++) {fill('@stone.1',rect(px-1+k*24,-170,4,122));fill('@stone.3',rect(px-3+k*24,-173,8,4));}
      }
      // Central entrance portico and spreading granite steps.
      fill('@stone.0',rect(-152,-188,304,164));
      fill('@stone.2',rect(127,-184,25,160));
      for(let k=0;k<8;k++)line('@stone.2',1.1,`M-152 ${-36-k*19}h304`,{op:.35,detail:true});
      for(const x of [-133,-100,86,119]) {window(x,-159,15,34,true,true);window(x,-91,15,31,true,true);}
      fill('@stone.2',`M-54-26v-66q54-59 108 0v66z`);
      fill('@glass',`M-41-26v-65q41-44 82 0v65z`);
      fill('@glass','M-39-67v-23q16-18 37-21v44zM2-111q21 3 37 21v23H2zM-39-63h37v35h-37zM2-63h37v35H2z',{glow:'window'});
      line('@stone.1',3,'M0-113v87M-40-65h80');
      fill('@stone.1',poly([[-174,-186],[0,-237],[174,-186]]));
      fill('@stone.2',poly([[-148,-189],[0,-228],[148,-189]]));
      fill('@stone.0',poly([[-128,-191],[0,-222],[128,-191]]));
      fill('@stone.3',rect(-176,-186,352,5));
      for(let k=0;k<8;k++) {
        const x=-135+k*38;
        fill('@stone.2',rect(x,-179,15,139));fill('@stone.1',rect(x-2,-179,12,137));
        for(let j=0;j<3;j++)line('@stone.3',.8,`M${x+j*3} -175v128`,{op:.55,detail:true});
        fill('@stone.3',rect(x-6,-181,25,7));fill('@stone.2',rect(x-5,-43,24,7));
      }
      for(let k=0;k<6;k++) {fill(k%2?'@stone.0':'@stone.1',rect(-164-k*8,-32+k*5,328+k*16,5));line('@stone.3',.9,`M${-164-k*8} ${-32+k*5}h${328+k*16}`);}
      // Faceted rotunda drum, arched openings and classical columns.
      fill('@stone.0',rect(-77,-290,154,64));
      fill('@stone.2',rect(54,-290,23,64));
      for(let k=0;k<9;k++) {
        const a=(k/8-.5)*Math.PI*.88, x=Math.sin(a)*68;
        window(x-5,-280,10,38,true,k%2===0);
        fill('@stone.1',rect(x-10,-290,4,63));fill('@stone.3',rect(x-12,-293,8,5));
      }
      fill('@stone.1',ell(0,-294,83,8));fill('@stone.2',rect(-82,-294,164,5));
      // Dome silhouette and ribs are real curves, not stacked semicircles.
      fill('@dome.0','M-79-298Q-76-337-51-358Q-29-379-13-382h26q16 3 38 24 25 21 28 60z');
      fill('@dome.2','M21-380q45 30 56 82H28q-2-57-7-82z', {op:.48});
      for(let k=-4;k<=4;k++) {
        const x=k*18, top=k*2.1;
        line('@dome.1',2.2,`M${top} -381Q${F(x*.68)} -353 ${x} -299`);
        lit.push({s:'#e4c8a0',w:1,op:.36,d:`M${top} -381Q${F(x*.68)} -353 ${x} -299`});
      }
      line('@dome.2',2,'M-73-319q73 16 146 0M-58-344q58 15 116 0');
      fill('@stone.1',rect(-82,-300,164,5));
      fill('@stone.0',rect(-16,-412,32,29));
      for(let k=0;k<3;k++)window(-11+k*8,-407,5,18,false,true);
      fill('@stone.3',ell(0,-414,22,4));
      fill('@dome.1','M-20-415q20-24 40 0z');
      line('@dome.2',3,'M0-436v11');fill('@stone.3',ell(0,-435,2,3));
      lit.push({f:{rad:[[0,'#ffdfae',.1],[1,'#ffdfae',0]],cx:0,cy:-285,r:140},d:ell(0,-285,123,113),op:.08});
      return {body,lit};
    },
  });
})();
