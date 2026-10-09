/* Native An Iowa farm in the morning wind; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"landmark.us-ia-farmland","category":"landmark","weight":0,"size":[490,320],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","lit"],"palette":{"base":{"stone":["#d5d4c7","#9aa8a4","#586d75"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#edf0e8","#a9bfc4","#587681"],"glass":["#2d657b","#88b7c9","#193c53"],"red":["#b35342","#d8835c","#783c37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":166.60000000000002,"ry":8,"h":320},"reflect":true,"tags":["landmark","signature","place:us/state:IA","us","us-midwest"],"night":{"glow":{"window":"#ffe0a4","lamp":"#ffe6b5","lava":"#f36a26"},"on":0.8}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.0',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L,body,lit){
 P('@red.2','M-220 0V-178L-113-287 16-182V0Z');P('@red.0','M-220 0V-178L-113-271 16-177V0Z');P('@red.1','M16-177L118-135V0H16Z');
 P('@wood.2','M-234-178L-113-301 132-147 118-135-113-277-218-165Z');P('@stone.2',D.rect(-226,-7,350,10));
 for(let i=0;i<25;i++){const x=-215+i*13;S(i%3?'@red.2':'@red.1',1.5,'M'+x+'-4V'+(x<16?-175:-131),.75);}
 P('@wood.2',D.rect(-150,-129,85,129));P('@wood.0',D.rect(-146,-124,77,124));S('@white',4,'M-146-124L-69 0M-69-124L-146 0M-108-124V0',.82);
 for(let j=0;j<2;j++)for(let i=0;i<5;i++)W(25+i*17,-117+j*28,10,13);W(-132,-224,38,25);W(-210,-137,26,34);
 S('@white',3,'M-218-171H16M-113-267V-192M-160-224L-67-191M-65-224L-160-191',.84);
 for(let i=0;i<23;i++){const x=-195+i*13.2,y=-181-Math.max(0,1-Math.abs(x+113)/125)*84;S('@wood.1',1,'M'+F(x)+' '+F(y)+'l77 43',.48,true);}
 P('@red.2','M152 0V-97L202-163 253-98V0Z');P('@red.0','M152 0V-97L202-147 253-97V0Z');P('@wood.2','M143-98L202-174 263-99 253-94 202-155 153-91Z');
 for(let i=0;i<9;i++)S('@red.1',1.2,'M'+(158+i*11)+'-2v-89',.65);P('@wood.0',D.rect(183,-62,36,62));S('@white',2,'M185-59L217-2M217-59L185-2');W(192,-125,21,15);
 L('#ffd6a4',D.rect(-132,-224,38,25),.45);
})(D,F,P,S,W,L,body,lit,r,ctx,v);const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();
/* Native An Iowa farm in the morning wind; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"structure.us-ia-wind-turbine","category":"structure","weight":0,"size":[210,480],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","rotor","lit"],"palette":{"base":{"stone":["#d5d4c7","#9aa8a4","#586d75"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#edf0e8","#a9bfc4","#587681"],"glass":["#2d657b","#88b7c9","#193c53"],"red":["#b35342","#d8835c","#783c37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":71.4,"ry":8,"h":480},"reflect":true,"tags":["place:us/state:IA","us","us-midwest","kit:temperate","role:building-far","unlit"],"anim":{"spin":{"part":"rotor","pivot":[0,-360],"period":16}},"night":{"glow":{"window":"#ffe0a4","lamp":"#ffe6b5","lava":"#f36a26"},"on":0.8}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.0',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L,body,lit){const rotor=[];
 P('@metal.2','M-12 0L-5-356 5-356 13 0Z');P('@metal.0','M-10 0L-4-356 0-356 3 0Z');P('@metal.1',D.rect(-14,-368,31,15,5));
 for(let i=0;i<7;i++)S('@metal.1',1,'M-7 '+(-42-i*42)+'h15',.45,true);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,pts=[[0,0],[6,-26],[4,-109],[-1,-112],[-6,-20]].map(([x,y])=>[F(x*Math.cos(a)-y*Math.sin(a)),F(x*Math.sin(a)+y*Math.cos(a)-360)]);rotor.push({f:'@metal.0',d:D.poly(pts)},{s:'@metal.2',w:.8,d:'M0-360L'+pts[2].join(' '),op:.5});}
 rotor.push({f:'@metal.1',d:D.circ(0,-360,9)});return{rotor};
})(D,F,P,S,W,L,body,lit,r,ctx,v);return Object.assign({body,lit},extra||{});}}));})();

/* A broad, leaning Iowa bur oak makes the right frame distinct from the tall left birch. */
(function(){sceneObjDefine({id:'tree.us-ia-bur-oak',category:'tree',weight:0,size:[380,302],variants:1,seasonal:true,shapeBySeason:true,flippable:false,parts:['body','crown'],shadow:{rx:63,ry:6,h:286},reflect:false,tags:['us','place:us/state:IA','kit:temperate','role:tree-near'],palette:{base:{bark:['#53634d','#263e37','#879073'],leaf:['#29483a','#4d6549','#83936a'],snow:['#c5d2c9','#97aea4']},spring:{leaf:['#294c3a','#557451','#91a477']},summer:{leaf:['#29483a','#4d6549','#83936a']},autumn:{leaf:['#514f32','#777047','#a99c68']},winter:{bark:['#526b63','#2f4845','#8a9e8e'],snow:['#cbd8d0','#a1b6ac']}},anim:{sway:{part:'crown',pivot:[0,-156],deg:.6,period:9.3}},build(v,r,ctx){const body=[
 {f:'@bark.1',d:'M-23 0Q-10-71-22-115L-49-167-105-201-144-236-128-242-87-214-47-204-60-235-106-274-90-283-43-246-16-187 9-209 25-254 42-264 42-226 80-243 128-261 146-254 104-224 64-199 35-161 18-116Q34-69 35 0Z'},
 {f:'@bark.0',d:'M-17 0Q-3-77-15-117L-39-174-90-210-124-236-91-219-35-190-21-148 4-121Q19-73 18 0ZM-32-199L-50-237-90-274-76-267-34-236-17-193ZM19-192L31-245 36-247 34-216 78-237 109-248 76-227 45-206 26-171Z'},
 {f:'@bark.2',op:.4,d:'M-11 0Q0-49-7-82L-3-112 7-91Q19-49 14 0Z'},
 {s:'@bark.1',w:2.4,d:'M-91-210L-134-195-163-207M-46-205L-66-253-60-282M47-213L70-263 83-276M101-237L143-226 166-245',cap:'round'},
 {s:'@bark.0',w:1.5,op:.65,d:'M-13-18Q-5-37-10-55M8-26Q13-47 8-71M-4-106L-14-126M-36-167L-57-184M21-168L40-192',detail:true},
 {f:'@bark.1',d:'M-6-82Q-12-95-3-101Q5-96 1-84L-2-91Z',detail:true}
 ],crown=[];
 if(ctx.season!=='winter')crown.push(
 {f:'@leaf.0',d:'M-168-151Q-185-182-158-197Q-176-224-144-236Q-151-265-116-265Q-96-285-68-264Q-37-283-14-259Q18-284 50-273Q81-293 105-270Q143-279 150-250Q183-239 165-211Q181-184 150-163Q143-127 106-139Q76-119 49-139Q18-115-7-140Q-38-110-66-130Q-113-112-126-143Q-155-130-168-151Z'},
 {f:'@leaf.1',d:'M-157-179Q-167-206-139-217Q-143-246-113-247Q-91-267-65-243Q-38-263-15-244Q4-259 25-254Q19-223-10-201Q-29-177-63-184Q-99-150-130-161Z'},
 {f:'@leaf.1',op:.65,d:'M41-244Q70-274 100-252Q129-262 137-233Q162-224 145-201Q156-181 132-167Q114-149 91-163Q68-146 54-170Q82-189 79-214Z'},
 {f:'@leaf.2',op:.55,d:'M-141-220Q-140-249-112-253Q-90-271-69-252L-98-239-114-218-138-207ZM-50-243Q-33-258-16-244L-27-225-45-210-57-219ZM63-260Q88-280 103-259L84-253 67-240 59-248Z'},
 {s:'@leaf.0',w:2,op:.48,d:'M-141-178q16-14 35-6M-81-219q15-12 32-4M-25-171q11-8 28-3M104-185q14-11 25-7',detail:true});
 else crown.push(
 {f:'@snow.0',d:'M-107-274L-91-284-45-247-43-241-67-254Z'},
 {f:'@snow.1',d:'M77-244L128-262 144-255 113-249 89-234Z'},
 {f:'@snow.0',d:'M-140-237L-129-243-92-216-89-212-107-221Z'});
 return{body,crown};}});})();
