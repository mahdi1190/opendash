/* Natural granite ledges above Franconia Notch. No drawn facial features. */
(function(){const D=sceneD,R=n=>Math.round(n*10)/10;
 sceneObjDefine({id:'tree.us-red-spruce',category:'tree',weight:0,size:[225,480],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['trunk','crown'],palette:{base:{bark:'#605c48',leaf:['#213f37','#3c5e48','#698067']},spring:{leaf:['#254c39','#477454','#8b9c69']},summer:{leaf:['#284b38','#4b6950','#7a8d62']},autumn:{leaf:['#30493b','#566950','#89906a']},winter:{leaf:['#38594f','#6d8b7d','#abbdb0']}},shadow:{rx:38,ry:5,h:180},anim:{sway:{part:'crown',pivot:[0,-220],deg:.5,period:9.7}},tags:['us','new-hampshire','red-spruce','kit:temperate','role:tree'],build(v,r,ctx){const trunk=[{f:'@bark',d:'M-6 2L-2-466 3-470 7 2z'}],crown=[],left=[],right=[],lean=(v-1)*9;
 for(let i=0;i<30;i++){const t=i/29,y=-475+t*422,w=5+Math.pow(t,.85)*95,z=i%3===1?1:.66+r()*.21;left.push([R(lean*t-w*z),R(y)]);right.push([R(lean*t+w*(i%3===2?1:.67+r()*.2)),R(y+4)]);}
 crown.push({f:'@leaf.0',d:D.poly([...left,[-13,-36],[2,-41],[20,-38],...right.reverse()])},{f:'@leaf.1',op:.72,d:D.poly([...left.slice(0,28),[-23,-84],[-13,-170],[-4,-289],[1,-460]])});
 for(let i=0;i<15;i++){const y=-445+i*27,w=9+i*5;crown.push({s:'@leaf.2',w:1.4,op:.45,d:`M0 ${y}q${R(-w*.4)} 8 ${-w} 13m${w} -13q${R(w*.5)} 7 ${w} 11`,detail:i>4});}
 if(ctx.season==='winter')for(let i=0;i<6;i++){const y=-432+i*64,w=10+i*15;crown.push({s:'#d7e1d4',w:3,op:.65,d:`M${-w} ${y+11}l${w-3} -8 10 3 ${w-5} 8`});}return{trunk,crown};}});
 // Distant crowns keep the spruce's jagged silhouette with two readable planes.
 sceneObjDefine({id:'tree.us-franconia-far-spruce',category:'tree',weight:0,size:[122,260],variants:3,seasonal:true,flippable:true,palette:sceneObj('tree.us-red-spruce').palette,parts:['body'],shadow:{rx:18,ry:2,h:140},
 tags:['us','new-hampshire','red-spruce','kit:temperate','role:tree'],build(v){const x=(v-1)*5;return{body:[
 {f:'@leaf.0',d:`M${x} -260l-10 37 4 1-21 36 12-2-31 44 16-3-33 46 19-4-35 53 30-6-13 35 49-6 48 6-13-35 29 6-35-53 19 4-33-46 16 3-31-44 12 2-21-36 4-1z`},
 {f:'@leaf.1',d:`M${x} -250l-6 32-9 27 4 19-18 29 7 13-21 30 12 19-24 32 28-6-10 34 26-5 3-70-6-56 10-53z`} ]};}});
 sceneObjDefine({id:'rock.us-franconia-ledges',category:'rock',weight:0,size:[650,550],variants:1,seasonal:true,parts:['body','lit'],flippable:false,shadow:false,palette:{base:{stone:['#657a84','#8c9b9d','#344f62','#b9beb2']},spring:{stone:['#6c8483','#a4ada3','#3d5c61','#c7c9b4']},summer:{stone:['#6b8280','#9ca89a','#395861','#c4c5a9']},autumn:{stone:['#7a7c84','#a6a09d','#414f68','#c8bca8']},winter:{stone:['#809ca8','#bacbd0','#47657e','#e0e6dd']}},tags:['us','new-hampshire','granite','natural','signature','landmark','kit:temperate','role:rock'],
 build(v,r,ctx){const body=[];
 body.push({f:'@stone.0',d:'M-334 7L-320-184-249-332-163-442-76-516-18-545 51-533 104-491 153-467 142-439 174-411 161-376 203-352 192-319 239-283 216-247 227-191 251-147 278-111 318-62 330 8z'},
 {f:'@stone.2',d:'M-334 7L-320-184-249-332-163-442-76-516-101-383-158-272-170-137-106 7z'},
 {f:'@stone.1',d:'M-76-516-18-545 51-533 104-491 153-467 142-439 66-462 16-407-18-391-39-447z'},
 {f:'@stone.2',d:'M142-439L174-411 161-376 203-352 192-319 239-283 216-247 157-271 125-330 99-388z'},
 {f:'@stone.1',d:'M-18-391L16-407 66-462 142-439 99-388 125-330 64-286 11-259-13-322z'},
 {f:'@stone.1',d:'M-158-272L-101-383-39-447-18-391-13-322-55-291-68-184-119-130z'},
 {f:'@stone.2',d:'M64-286L125-330 157-271 216-247 227-191 251-147 173-177 117-203 73-204 27-168z'},
 {f:'@stone.1',op:.6,d:'M-68-184L-55-291-13-322 11-259 64-286 27-168-10-109-31 7-106 7-119-130z'},
 {f:'@stone.3',op:.42,d:'M104-491L153-467 142-439 123-444 120-469zM161-376L203-352 192-319 176-328zM216-247L227-191 251-147 230-153 204-206z'},
 {s:'@stone.3',w:2.4,op:.55,d:'M-14-537L43-527 96-487 144-464M145-432l22 22-16 31 43 25M193-310l37 27-24 34M215-232l4 40 22 42'});
 for(let i=0;i<29;i++){const x=-265+r()*450,y=-55-r()*345,dx=18+r()*43;body.push({s:i%3?'@stone.2':'@stone.3',w:.7+r()*.9,op:.33+r()*.22,d:`M${R(x)} ${R(y)}l${R(dx)} ${R(-6-r()*10)}l${R(dx*.34)} ${R(9+r()*9)}`,detail:i>10});}
 for(let i=0;i<18;i++){const x=-270+r()*486,y=-34-r()*310;body.push({f:i%2?'@stone.2':'@stone.1',op:.22,d:D.poly([[x,y],[x+7,y-2],[x+15,y+2],[x+6,y+6]]),detail:true});}
 if(ctx.season==='winter')body.push({s:'@stone.3',w:5,op:.8,d:'M-76-516-18-545 51-533 104-491 153-467M-158-272l58-14M-68-184l47-11M173-177l49 21'});
 const lit=[{f:'#a6c5d0',op:.37,d:'M-76-516L-18-545 51-533 104-491 153-467 142-439 66-462 16-407-18-391-39-447Z'},{f:'#829eaf',op:.27,d:'M-18-391L16-407 66-462 142-439 99-388 125-330 64-286 11-259-13-322Z'},{s:'#bcd4d8',w:2.6,op:.67,d:'M-76-516L-18-545 51-533 104-491 153-467M145-432l22 22-16 31 43 25M193-310l37 27-24 34M215-232l4 40 22 42'},{s:'#8baab7',w:1.6,op:.48,d:'M-158-272l58-14M-68-184l47-11M173-177l49 21'}];return{body,lit};}});
})();
