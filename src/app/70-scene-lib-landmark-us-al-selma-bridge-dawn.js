/* Native through-arch steelwork, stone piers and a row of deck lamps. */
(function(){const D=sceneD,R=n=>Math.round(n*10)/10;
  sceneObjDefine({id:'landmark.us-al-selma-bridge',category:'landmark',weight:0,size:[820,280],variants:1,seasonal:false,flippable:false,parts:['body','lit'],palette:{base:{steel:['#5d747b','#bdc9bf','#344e59'],stone:['#a09982','#c4b99c','#727d75'],road:['#5f6965','#9d9d82']}},night:{glow:{lamp:'#ffdca0'},on:1},reflect:true,tags:['landmark','place:us/state:AL','us','arch-bridge'],
    build(){const body=[],lit=[],P=(f,d,op)=>body.push({f,d,op}),S=(s,w,d,op)=>body.push({s,w,d,op,cap:'round'});
      for(const x of [-335,305]){P('@stone.2',D.poly([[x-21,35],[x-17,-45],[x+17,-45],[x+23,35]]));P('@stone.0',D.poly([[x-21,35],[x-17,-45],[x+4,-45],[x+7,35]]));P('@stone.1',D.rect(x-23,-48,46,8));for(let j=0;j<5;j++)S('@stone.1',1.1,`M${x-16} ${-35+j*14}h32m-13 0v11`,.55);}
      P('@road.0','M-414-30L407-40 419-23-411-12z');P('@road.1','M-414-30L407-40 410-34-413-23z');P('@steel.2','M-414-16L419-27v12l-833 11z');
      const top=x=>-242+202*Math.pow(x/398,2),back=x=>top(x)-17;
      let arch='',far='';for(let i=0;i<=24;i++){const x=-398+i*796/24;arch+=(i?'L':'M')+R(x)+' '+R(top(x));far+=(i?'L':'M')+R(x+8)+' '+R(back(x));}
      S('@steel.2',12,far);S('@steel.0',8,far);S('@steel.2',14,arch);S('@steel.1',4.2,arch,.9);
      for(let i=0;i<22;i++){const x=-382+i*36.3,y=top(x),xn=x+36.3,yn=top(xn),foot=-25-x*.012;
        S('@steel.0',3.6,`M${R(x)} ${R(y)}L${R(x)} ${R(foot)}`);S('@steel.2',2.2,`M${R(x)} ${R(foot)}L${R(xn)} ${R(yn)}M${R(x)} ${R(y)}L${R(xn)} ${R(foot-.4)}`,.88);S('@steel.1',1.1,`M${R(x+1.5)} ${R(y+5)}V${R(foot-2)}`,.7);
        S('@steel.0',1.9,`M${R(x)} ${R(y)}l8-17M${R(x)} ${R(y)}L${R(xn+8)} ${R(yn-17)}`,.8);
        P('@steel.1',D.ell(x,y+5,1.6,1.6));P('@steel.1',D.ell(x,foot-3,1.6,1.6));
      }
      S('@steel.1',2,'M-413-35L410-45M-413-17L419-28',.9);
      for(let i=0;i<12;i++){const x=-365+i*66,y=-41-x*.012;S('@steel.2',2.2,`M${x} ${R(y)}v-15`);P('@steel.0',D.rect(x-5,y-21,10,6,2));body.push({f:'#d7d6b7',d:D.rect(x-3,y-20,6,4,1),glow:'lamp'});lit.push({f:{rad:[[0,'#ffdb98',.18],[1,'#e7c185',0]],cx:x,cy:y-12,r:27},d:D.ell(x,y-12,26,22)});}
      lit.push({s:'#b4c9cc',w:2,op:.55,d:arch},{s:'#a5bdc1',w:1.5,op:.6,d:'M-414-17L419-28'});return{body,lit};}
  });
})();
