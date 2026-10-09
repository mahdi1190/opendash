/* Native A Door County lighthouse; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"landmark.us-wi-door-lighthouse","category":"landmark","weight":0,"size":[420,436],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","lit"],"palette":{"base":{"stone":["#e5e2ca","#b2bdb0","#65817e"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#edf0e8","#a9bfc4","#587681"],"glass":["#2d657b","#88b7c9","#193c53"],"red":["#a34f3c","#cb7956","#723e37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":142.8,"ry":8,"h":436},"reflect":true,"tags":["landmark","signature","place:us/state:WI","us","us-midwest"],"night":{"glow":{"window":"#ffe0a4","lamp":"#ffe6b5","lava":"#f36a26"},"on":0.8}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L){
 P('@stone.2','M-185 0V-121L-93-177-2-122V0Z');P('@red.0','M-194-120L-93-186 8-120-2-110-93-172-181-111Z');P('@stone.0',D.rect(-178,-116,170,116));
 for(let i=0;i<9;i++)S('@stone.1',1,'M-176 '+(-8-i*12)+'h166',.46,i%2===0);
 for(let j=0;j<2;j++)for(let i=0;i<3;i++){const x=-157+i*51,y=-104+j*50;P('@stone.2',D.rect(x-2,y-2,25,32));W(x,y,21,28);S('@white',1,'M'+(x+10)+' '+y+'v28m-10-14h21',.65,true);}
 P('@wood.2',D.rect(-110,-49,32,49));P('@wood.0',D.rect(-105,-45,22,45));
 P('@stone.1','M-6 0L15-311 105-311 128 0Z');P('@stone.0','M-6 0L15-311H47L37 0Z');P('@stone.2','M90-311H105L128 0H100Z');
 for(let i=0;i<29;i++){const y=-8-i*10.4,x=-5+i*.7,w=132-i*1.45;S('@stone.1',.8,'M'+F(x)+' '+F(y)+'h'+F(w),.52,i%3===0);}
 P('@metal.2',D.rect(0,-323,119,12));P('@metal.1',D.rect(8,-375,104,53));
 for(let i=0;i<8;i++){const x=13+i*12;W(x,-369,8,36);S('@metal.2',2,'M'+(x-2)+' -373v49');}
 P('@red.2','M0-375L60-414 121-375Z');P('@red.0','M0-375L60-414 66-375Z');P('@metal.2',D.rect(55,-427,9,14));
 S('@metal.2',2.5,'M-7-319H128M-2-330H122');for(let i=0;i<10;i++)S('@metal.2',1.5,'M'+(i*14-3)+' -318v-12',.8,true);
 for(const y of[-70,-164,-258]){P('@stone.2',D.rect(43,y,20,28));W(47,y+3,12,22);}
 L('#e8e5ba',D.ell(60,-351,15,5),.65);L('#bacdd3','M15-311H23L3 0H-6Z',.25);
})(D,F,P,S,W,L,body,lit,r,ctx,v);const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();
