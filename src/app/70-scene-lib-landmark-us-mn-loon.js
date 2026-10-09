/* Common loon: curved neck, dagger bill, barred collar and tapered checkered
   wing. The original close lake subject gains modeled seasonal plumage. */
(function () {
  const D=sceneD,F=n=>Math.round(n*10)/10;
  sceneObjDefine({id:'bird.us-common-loon',category:'bird',weight:0,size:[458,238],variants:1,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','head'],reflect:true,
    palette:{base:{black:['#141d23','#26333a','#3d4a50'],white:['#f4f2df','#cdd8ce'],bill:['#222d31','#536368'],eye:'#b5272d',wake:'#d7ebe6'},spring:{},summer:{},autumn:{black:['#303b3d','#53605c','#6d7770'],white:['#d9dccb','#b9c6b9']},winter:{black:['#4b5658','#6e7b7a','#899390'],white:['#e5e9df','#c8d4ce']}},
    anim:{paddle:{dy:1.2,deg:1.1,period:3.6},turn:{part:'head',pivot:[-106,-68],deg:5,period:10,hold:.72}},
    tags:['landmark','signature','place:us/state:MN','us','us-midwest','common-loon','kit:birds','kit:water','role:bird'],
    build(v,r,ctx){
      const breeding=ctx.season!=='winter',body=[],head=[];
      body.push({f:'@wake',op:.11,d:'M-217 7Q-182-12-128-7Q12 8 165-2Q207-6 244 9Q195 20 130 17Q-70 23-217 7Z'},
        {s:'@wake',w:2.2,op:.48,d:'M-230 12Q-165 29-83 20M-210-2Q-173-13-152-10M157-6Q208-9 238 4M131 27Q196 28 251 16'},
        {s:'@wake',w:1.2,op:.3,d:'M-247 24Q-159 45-59 31M110 36Q201 40 270 23'},['@black.0','M-156-3Q-172-29-139-54Q-99-103-18-94Q86-106 193-49L231-32 186-18Q169-4 148 0Z'],
        ['@white.0','M-154-3Q-135-24-83-28Q22-31 114-13L174-20 165-1Z'],['@black.1','M-128-56Q-34-108 76-80Q144-63 183-39Q72-64-128-56Z'],
        ['@black.2','M-119-58Q-25-95 66-76Q-12-86-106-51Z',.6],{s:'@black.2',w:1.6,d:'M-113-60Q28-93 159-48',op:.8});
      for(let row=0;row<5;row++)for(let col=0;col<18;col++){
        const x=-103+col*16+row*3.5,y=-63+row*9+Math.pow((col-7)/12,2)*16;
        if(breeding)body.push({f:row%2?'@white.1':'@white.0',d:D.poly([[F(x),F(y)],[F(x+6-row*.3),F(y-.6)],[F(x+6-row*.3),F(y+4.3)],[F(x),F(y+4.8)]])});
        else if((col+row)%3===0)body.push({s:'@black.2',w:1.2,op:.55,d:`M${F(x)} ${F(y)}q5-2 10 0`});
      }
      head.push(['@black.0','M-145-7Q-173-24-158-62Q-145-102-160-159Q-181-177-167-202Q-158-224-134-230Q-108-232-95-213Q-88-198-101-181Q-120-158-106-118Q-96-91-80-81Z'],
        ['@black.1','M-160-198Q-160-219-139-222Q-122-220-116-211Q-145-218-160-198Z',.9],
        ['@black.2','M-151-166Q-142-111-117-85L-103-83Q-127-124-130-169Z',.58],
        ['@bill.0','M-163-206L-227-194-163-191Z'],['@bill.1','M-223-194L-165-201-164-198Z'],
        ['@eye',D.ell(-144,-207,4.8,4.4)],['#fff4d0',D.circ(-145.4,-208.2,1)],{s:'@black.2',w:1.1,d:'M-161-190q-10 4-15 1',op:.8});
      if(breeding)for(let i=0;i<9;i++){
        const y=-156+i*5.9,x=-151+i*.9;
        head.push({s:i%3?'@white.0':'@white.1',w:i%3?2.3:3,d:`M${F(x)} ${F(y)}l${F(21+i*.45)} -4`,cap:'round'});
      }else head.push(['@white.1','M-161-185Q-152-179-143-183Q-136-145-119-114L-108-93-122-91Q-147-137-161-185Z'],['@white.0','M-162-201Q-171-196-161-190L-148-190Z',.8]);
      return{body,head};
    }});
  // Dense, irregular black-spruce crowns replace the legacy stacked-oval far trees.
  sceneObjDefine({id:'tree.us-loon-spruce',category:'tree',weight:0,size:[160,340],variants:4,seasonal:true,flippable:true,parts:['body','crown'],shadow:{rx:40,ry:5,h:285},reflect:true,
    palette:{base:{bark:['#574c3d','#8b7657'],leaf:['#244b3e','#41634a','#688568']},spring:{leaf:['#315d43','#53794f','#7c9b6a']},summer:{leaf:['#244b38','#416342','#66845b']},autumn:{leaf:['#4c6041','#6a7950','#8e9362']},winter:{leaf:['#405a52','#668176','#90a69a']}},
    anim:{sway:{part:'crown',pivot:[0,-95],deg:.55,period:7.4}},tags:['us','black-spruce','kit:temperate','role:tree'],
    build(v,r){const body=[{f:'@bark.0',d:'M-6 0L-3-291 2-310 8 0Z'},{s:'@bark.1',w:2,d:'M-2-7L0-270',op:.7}],crown=[],left=[],right=[],h=270+v*16;
      for(let i=0;i<15;i++){const t=i/14,y=-h+t*(h-47),w=5+Math.pow(t,.8)*(42+v*5),lean=(v-1.5)*3;left.push([F(-w*(.7+r()*.4)+lean),F(y+4+r()*9)],[F(-w*.4+lean),F(y+13+r()*4)]);right.push([F(w*(.75+r()*.35)+lean),F(y+7+r()*8)],[F(w*.4+lean),F(y+15+r()*4)]);}
      crown.push({f:'@leaf.0',d:D.poly([[0,-h-18],...right,[9,-30],[-8,-28],...left.reverse()])});
      for(let j=0;j<13;j++){const t=j/13,y=-h+22+j*(h-50)/13,w=8+Math.pow(t,.9)*(40+v*4);crown.push({f:'@leaf.1',d:D.poly([[-w*.8,y+9],[-w*.25,y-4],[2,y-13],[w*.8,y+6],[w*.27,y+5],[-w*.2,y+16]])},{s:'@leaf.2',w:1.5,op:.6,d:'M'+F(-w*.7)+' '+F(y+8)+'Q-3 '+F(y-5)+' '+F(w*.48)+' '+F(y+5),detail:true});}
      return{body,crown};}});
  sceneObjDefine({id:'tree.us-lake-paper-birch',category:'tree',weight:0,size:[180,340],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','crown'],shadow:{rx:40,ry:5,h:270},reflect:true,
    palette:{base:{bark:['#dfdfc9','#899b8c','#4d655a'],leaf:['#416a4a','#71905b','#9cb578']},spring:{leaf:['#527f45','#87ab58','#bbce7a']},summer:{leaf:['#3c6845','#6a8f54','#95b370']},autumn:{leaf:['#8c7945','#bca255','#d5bd71']},winter:{leaf:['#8f9c8f','#adb8a6','#c6cec0']}},anim:{sway:{part:'crown',pivot:[0,-110],deg:1.2,period:7.7}},tags:['us','paper-birch','kit:temperate','role:tree'],build(v,r,ctx){const D=sceneD,body=[{f:'@bark.1',d:'M-9 0L-4-160-25-233-16-240 4-176 27-271 33-267 14-158 11 0Z'},{f:'@bark.0',d:'M-7 0L-3-160-21-234-17-236 6-172 29-269 31-268 11-156 4 0Z'}],crown=[];
    if(ctx.season!=='winter'){crown.push({f:'@leaf.0',d:'M-64-122Q-103-146-76-177Q-98-214-63-226Q-72-258-37-265Q-24-302 2-290Q35-309 49-274Q86-276 84-241Q107-229 82-200Q100-167 64-150Q43-117 4-127Z'},{f:'@leaf.1',d:'M-65-146Q-80-174-55-191Q-80-217-47-234Q-54-262-24-266Q-2-285 19-270Q43-283 48-252Q75-248 60-220Q82-196 55-178Q43-142 6-145Z'},{f:'@leaf.2',op:.65,d:'M-62-194Q-68-213-41-226Q-48-251-21-258Q1-275 19-259Q-7-245-15-221Q-27-193-62-194Z'});}
    for(let i=0;i<18;i++){const y=-38-i*13.5,dir=i%2?-1:1,x=dir*(10+(i%5)*10);body.push({s:'@bark.0',w:1.1,d:'M2 '+y+'q'+x+' -12 '+(x*1.1)+' -33',op:.7,detail:i<10});if(i<9)body.push({s:'@bark.2',w:1.2,d:'M-4 '+(-17-i*17)+'h7',detail:true});}
    return{body,crown};}});
})();
