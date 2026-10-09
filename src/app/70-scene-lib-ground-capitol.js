/* Fine exposed aggregate and worn edges on the broad Capitol walk. */
(function(){
  if(typeof sceneDraw==='undefined')return;
  const {define,ell,f1:F}=sceneDraw;
  define({id:'ground.capitol-aggregate',category:'ground',size:[52,12],variants:4,seasonal:false,flippable:true,
    tags:['texas','austin','paving','kit:urban','role:ground'],
    build(v,r){let light='',dark='';for(let i=0;i<8+v;i++){const x=(r()-.5)*46,y=-r()*10;const d=ell(x,y,.7+r()*1.4,.3+r()*.55);if(i%2)light+=d;else dark+=d;}return{body:[['#f3dfb7',light,.32],['#766c5a',dark,.2]]};}
  });
  define({id:'ground.capitol-paver-joint',category:'ground',size:[90,8],variants:4,seasonal:false,flippable:true,
    tags:['texas','austin','paving-joint','kit:urban','role:ground'],
    build(v,r){const x=-40+r()*8,w=55+r()*20;return{body:[{s:'#7d7767',w:.6,op:.24,d:`M${F(x)} -3h${F(w)}l${F(4+r()*8)} -3`},{s:'#f2dfb8',w:.8,op:.28,d:`M${F(x)} -2h${F(w)}`}]};}
  });
})();
