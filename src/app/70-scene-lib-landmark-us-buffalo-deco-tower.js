/* Buffalo's broad civic wings rise through successive limestone Art Deco setbacks. */
(function(){if(typeof sceneObjDefine!=='function')return;const D=sceneDraw;
 sceneObjDefine({id:'landmark.us-buffalo-city-hall',category:'landmark',weight:0,size:[870,635],box:[-435,-635,435,3],variants:1,seasonal:false,shapeBySeason:true,flippable:false,parts:['body','lit'],palette:{base:{stone:['#c9c5b3','#e6dfc8','#9eaa9f','#6e8790'],bronze:['#8e9b83','#bcb78c'],glass:'#67868e'},winter:{stone:['#c9d3d0','#e5e8df','#a2b8bc','#6c8c9e'],bronze:['#819b91','#c1c8ac'],glass:'#6c8ea5'}},night:{glow:{window:'#f1d49d',lamp:'#ffe5b5'},on:.72},shadow:{rx:280,ry:12,h:590},reflect:true,tags:['landmark','us','place:us/place:buffalo'],build(v,r,ctx){const body=[],lit=[];
 const blocks=[[-422,-61,164,61],[-260,-130,520,130],[258,-61,164,61],[-194,-229,388,99],[-92,-424,184,195],[-69,-480,138,56],[-47,-529,94,49],[-31,-568,62,39]];
 for(const[x,y,w,h]of blocks){body.push({f:'@stone.0',d:D.rect(x,y,w,h)},{f:'@stone.2',d:D.rect(x+w-21,y,21,h)},{s:'@stone.1',w:3,d:`M${x-3} ${y}h${w+6}`});}
 body.push({f:'@bronze.0',d:'M-34-568L0-610 34-568z'},{f:'@bronze.1',d:'M-34-568L0-610v42z'},{s:'@bronze.1',w:3,d:'M0-610v-22'},{f:'@stone.3',d:'M-22 0V-42q22-22 44 0V0z'},{f:'@glass',d:'M-14 0V-36q14-15 28 0V0z',glow:'window'});
 for(const[x,y,w,h,cols,rows]of [[-246,-111,492,91,14,3],[-180,-212,360,79,12,2],[-78,-410,156,177,6,7],[-56,-467,112,40,4,2],[-34,-516,68,33,3,1]]){
 const cw=w/cols,rh=h/rows;for(let c=0;c<cols;c++){body.push({s:'@stone.3',w:2.1,d:`M${D.f1(x+c*cw)} ${y}v${h}`,detail:true});for(let j=0;j<rows;j++){const wx=x+c*cw+cw*.3,wy=y+j*rh+3;body.push({f:'@stone.3',d:D.rect(wx-2,wy-2,cw*.4+4,rh*.67+4)},{f:'@glass',d:D.rect(wx,wy,cw*.4,rh*.67),glow:'window',detail:(c+j)%4===0});}}}
 for(const x of [-399,-368,-337,328,359,390])body.push({f:'@glass',d:D.rect(x,-44,14,28),glow:'window'},{s:'@stone.1',w:2,d:`M${x-3} -47v34h20v-34`,detail:true});
 for(let y=-126;y<-8;y+=12)body.push({s:'@stone.2',w:.75,op:.55,d:`M-259 ${y}H258`,detail:true});
 for(let x=-182;x<190;x+=22)body.push({f:'@bronze.0',d:`M${x} -225h7v9l-3 5-4-5z`,detail:true});
 body.push({f:'@bronze.1',d:D.ell(0,-587,7,7),glow:'lamp'},{s:'@stone.3',w:4,d:'M-30-47h60M-267-132H267M-201-231H201'});
 if(ctx.season==='winter')for(const[x,y,w]of blocks)body.push({s:'#e7eeea',w:3.5,op:.85,d:`M${x} ${y-1}h${w-18}`});
 lit.push({f:'#f0d3a0',op:.13,d:'M-29-568v-40h58v40z'},{s:'#e8cca0',w:2,op:.5,d:'M-91-423H91M-193-229H193'});return{body,lit};}});
})();
