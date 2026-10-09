/* Native geometry for The Art Museum wings on the lake, Milwaukee. Original subject, no painting import.
   Draft composition lives in the matching 71 file. */
(function(){
 const D=sceneD,F=n=>Math.round(n*10)/10;
 sceneObjDefine({id:"landmark.us-milwaukee-art-museum",category:"landmark",weight:0,size:[906,250],variants:1,seasonal:false,shapeBySeason:false,flippable:false,parts:["body","lit"],palette:{"base":{"stone":["#d9d6c7","#a6aaa5","#707c7e"],"metal":["#e9eee8","#a2b9bd","#556f79"],"glass":["#2c6377","#91bdc6","#173c50"],"wood":["#84513c","#ba7751","#573a31"],"roof":["#2f4953","#657982"],"accent":"#a94938","white":"#eef1e8","black":"#223237","water":"#a0d6da","soil":["#877754","#b8a17a","#5c5e42"]},"spring":{},"summer":{},"autumn":{},"winter":{"stone":["#d9e1df","#a9b8bb","#7c8f98"]}},night:{glow:{window:'#ffdc97',lamp:'#ffe5a9'},on:.78},shadow:{rx:371,ry:9,h:330},reflect:true,tags:["landmark","signature","place:us/place:milwaukee","us","us-midwest"],
 build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),L=(f,d,op)=>lit.push({f,d,op}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true});
 ((D,F,P,S,L,W)=>{
 P('@glass.2','M-155 0L0-235 155 0Z');P('@glass.0','M-140 0L0-225 7-4Z');P('@glass.1','M0-225L141 0 12-5Z',.6);
 for(let i=0;i<19;i++){const x=-140+i*15;S('@metal.0',2,`M${x} -2L0-225`,.7);W(x,-13,5,8);}
 P('@metal.1','M-500-5Q-320-85-128-179Q-53-231 0-225Q53-231 128-179Q320-85 500-5L398 8Q170-22 0-180Q-170-22-398 8Z');
 for(let i=0;i<30;i++){const t=(i+1)/31,ex=500*t,ey=-5-40*Math.sin(t*Math.PI),cy=-330+170*t;
 for(const sg of[-1,1]){S('@metal.0',4.2,`M0-180Q${F(sg*ex*.42)} ${F(cy)} ${F(sg*ex)} ${F(ey)}`,.98);S('@metal.2',1.2,`M${sg*2}-178Q${F(sg*ex*.42+3)} ${F(cy+4)} ${F(sg*ex+3)} ${F(ey+4)}`,.75,true);}}
 P('@white',D.rect(-385,-8,770,14));for(let i=0;i<14;i++)L('#fff0ca',D.rect(-338+i*48,-5,18,2));
})(D,F,P,S,L,W,body,lit,r,ctx);// Window grids retain their geometry while sharing a few paint paths.
 const compactWindows=body.filter(q=>q.glow==='window');if(compactWindows.length>55){const keep=body.filter(q=>q.glow!=='window'),groups=Array.from({length:40},()=>[]);compactWindows.forEach((q,i)=>groups[i%40].push(q.d));for(const paths of groups)keep.push({f:'@glass.1',d:paths.join(''),glow:'window',detail:true});body.splice(0,body.length,...keep);}
 for(let i=2;i<30;i+=3){const t=(i+1)/31,ex=500*t,ey=-5-40*Math.sin(t*Math.PI),cy=-330+170*t;for(const sg of[-1,1])lit.push({s:'#dce5df',w:2.7,op:.38,d:'M0-180Q'+F(sg*ex*.42)+' '+F(cy)+' '+F(sg*ex)+' '+F(ey)});}
   const perspective=q=>Object.assign({},q,{m:[.88,0,0,1,0,0]});return{body:body.map(perspective),lit:lit.map(perspective)};}});
 
})();
