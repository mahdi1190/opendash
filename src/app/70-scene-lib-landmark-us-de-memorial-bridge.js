/* Twin Delaware suspension spans, with separate deck planes and catenaries. */
(function(){const R=n=>Math.round(n*10)/10;
 sceneObjDefine({id:'landmark.us-de-memorial-bridge',category:'landmark',weight:0,size:[950,470],variants:1,seasonal:false,flippable:false,parts:['body','lit'],shadow:false,reflect:true,night:{glow:{lamp:'#f6d68c'},on:.75},tags:['landmark','us','place:us/state:DE'],
 build(){const body=[],lit=[];
  const span=(dx,dy,sc,col,back)=>{const p=(d,extra={})=>body.push(Object.assign({d,m:[sc,0,0,sc,dx,dy]},extra));
   p('M-476-35L474-35 478-14-480-14z',{f:col});p('M-476-36H474',{s:back?'#a2b9b7':'#d4ddd3',w:3.2});
   for(const x of [-170,275]){p(`M${x-19} 1V-428h43V1h-11v-398h-20V1z`,{f:col});p(`M${x-18}-428h9V1h-9z`,{f:back?'#aac0ba':'#d2ded1'});p(`M${x+14}-428h10V1h-10z`,{f:back?'#6e9692':'#567f78'});for(const y of [-395,-310,-225,-140,-55])p(`M${x-8} ${y}h23v7h-23z`,{f:col});}
   // A taut cable curves between towers; hanger endpoints follow that curve.
   p('M-475-152Q-310-291-170-418Q52-66 275-418Q370-293 475-191',{s:back?'#9fb8b3':'#c0d3c6',w:4.5});
   for(let x=-154;x<272;x+=19){const t=(x+170)/445,y=-418+704*t*(1-t);p(`M${x} ${R(y)}V-36`,{s:back?'#7da3a0':'#a2beb2',w:1.4});}
   for(let x=-462;x<465;x+=27){p(`M${x}-17l13-16 14 16`,{s:back?'#8ba8a1':'#b1c8b9',w:1.25});if(!back&&x%3===0)body.push({f:'#d3c4a3',d:`M${R(dx+x*sc)} ${R(dy-42*sc)}h3v3h-3z`,glow:'lamp'});}
   for(let x=-446;x<475;x+=51)lit.push({f:'#ffd989',d:`M${R(dx+x*sc)} ${R(dy-38*sc)}h2.5v3h-2.5z`});
  };
  body.push({f:'#979d88',d:'M-534-88L-468-107-413-69-439-33-537-50zM385-84L449-106 519-67 505-21 436-31z'},{f:'#748779',d:'M-537-50L-439-33V-14L-537-30zM436-31L505-21v20l-69-15z'});
  span(-37,-73,.92,'#749b96',true);span(0,0,1,'#91afa3',false);
  body.push({f:'#8f9586',d:'M-480 10V-48h29v58zM451 10v-58h29v58z'},{f:'#c4c3ad',d:'M-480-48h29v6h-29zM451-48h29v6h-29z'});
  return{body,lit};}});
})();
