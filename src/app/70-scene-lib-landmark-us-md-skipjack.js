/* Chesapeake skipjack: two unequal sails, shallow hull, cabin and rigging. */
(function(){const D=sceneD,R=n=>Math.round(n*10)/10;
 sceneObjDefine({id:'boat.us-chesapeake-skipjack',category:'boat',weight:0,size:[655,505],variants:1,seasonal:false,flippable:false,parts:['sails','hull','lit'],night:{glow:{window:'#ffdb9d',lamp:'#f7db9f'},on:.75},anim:{paddle:{dy:2.1,deg:.55,period:5.1},sway:{part:'sails',pivot:[0,-73],deg:.6,period:9.3}},reflect:true,tags:['us','maryland','skipjack','signature','landmark','kit:boats','role:boat'],
 build(){const sails=[],hull=[],lit=[];
 sails.push({f:'#f6edd8',d:'M-8-484Q-32-372-114-271L-229-91-8-84z'},{f:'#d5c4a3',d:'M-8-484Q-44-348-114-271L-229-91-203-92Q-99-267-8-484z'},{f:'#fff7e6',d:'M9-378L304-110 15-96Q33-225 9-378z'},{f:'#d5c4aa',d:'M9-378L304-110 264-111 25-335z'},
 {s:'#e3d5b9',w:1.8,d:'M-12-450Q-56-315-194-104M12-344L269-112'});
 for(let i=0;i<13;i++){const y=-125-i*24,t=(-y-84)/400,x=-225*(1-t);sails.push({s:'#b7ac93',w:.8,op:.55,d:`M${R(x)} ${y}Q${R(x*.45)} ${y+3}-10 ${y}`,detail:i>4});}
 for(let i=0;i<10;i++){const t=(i+1)/11,y=-378+282*t,x=9+295*t;sails.push({s:'#c0b497',w:.8,op:.58,d:`M${R(17+t*7)} ${R(y+12)}L${R(x-7)} ${R(y+8)}`,detail:i>3});}
 hull.push({f:'#564b39',d:'M-5-72L-7-499H2L5-72zM-236-89H2v7h-238zM216-99l107-17v7l-104 24z'},
 {s:'#796a4d',w:2.2,d:'M-7-489L-246-81M-7-489L307-109M-7-489L225-82M-7-489L-237-64'},
 {f:'#ede9dd',d:'M-254-79L225-113 215-58Q187-21-16-14Q-184-16-235-47z'},
 {f:'#24465c',d:'M-248-64L223-98 215-58Q187-21-16-14Q-184-16-235-47z'},
 {f:'#a24937',d:'M-234-43Q-119-1 18-19Q157-23 213-56L197-43Q115-7-19-6Q-173-9-227-30z'},
 {f:'#c4ac74',d:'M-254-78L225-114v5L-252-73z'},
 {f:'#efe8d8',d:'M-235-79V-139h128v52z'},{f:'#a14b37',d:'M-243-139l67-24h78v24z'},
 {f:'#c7b69c',d:'M-111-136h13v48h-13z'},
 {s:'#17364b',w:1.5,op:.8,d:'M-238-52Q-85-21 207-68M-211-32Q-68-9 168-42'});
 for(const x of [-220,-188,-156]){hull.push({f:'#587b85',d:D.rect(x,-122,24,20),glow:'window'},{s:'#b6c3bc',w:1.2,d:`M${x+12}-122v20M${x}-112h24`});}
 hull.push({f:'#557e6c',d:D.rect(202,-111,4,5),glow:'lamp'},{f:'#a54e49',d:D.rect(-244,-82,4,5),glow:'lamp'});
 for(let i=0;i<13;i++){const x=-211+i*32,y=-79-(x+211)*.07;hull.push({s:'#b3a889',w:1.1,d:`M${x} ${R(y)}v-13`,detail:i>5});}
 for(let i=0;i<10;i++)hull.push({f:'#877a5e',d:D.ell(-71+i*15,-60,2.2,1.4),detail:true});
 lit.push({f:'#a6bcc1',op:.13,d:'M-8-484Q-32-372-114-271L-229-91-8-84z'},{f:'#adc0c3',op:.1,d:'M9-378L304-110 15-96z'});return{sails,hull,lit};}});
})();
