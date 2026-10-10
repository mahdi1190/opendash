/* Four real viewpoints, one place: Reepham, Norfolk. Lazy v2 scenes; no
   raster backdrops. County/nearby eligibility matches the UK proof packs. */
function sceneUkReephamItems() {
  if(typeof sceneItem!=='function')return [];
  const views=[
    ['market','Market Place','The stepped-gable shop frontage on the west of Market Place',sceneUkReephamV1,52.76323,1.1122,'landmark','orange'],
    ['churchyard','St Mary and St Michael','The two flint churches from the shared churchyard',sceneUkReephamV2,52.76212,1.1134,'heritage','green'],
    ['station','Former Reepham station','Marriott\'s Way past the former station and platform',sceneUkReephamV3,52.768149,1.11511,'heritage','green'],
    ['whitwell','Whitwell & Reepham Railway','The heritage yard from the south platform',sceneUkReephamV4,52.751515,1.097767,'heritage','green']];
  return views.map(([view,label,site,fn,lat,lon,kind,colour],i)=>{
    let data=null;
    return sceneItem({id:'norfolk-reepham-'+view,label:label+', Reepham',site,colour,mood:'calm',
      intensity:'standard',priority:1,theme:'any',region:['GB-ENG'],tags:['uk','norfolk','reepham',kind],
      county:'norfolk',ukRegion:'east',ukKind:kind,ukPart:'uk-east-reepham',ukPlace:'reepham',ukLocality:'Reepham',ukTown:'Reepham',ukView:view,
      signature:i===0,liveSky:{lat,lon},when:(day,ctx)=>!!ctx&&!!ctx.county&&(ctx.county==='norfolk'||
        (typeof animUkScenePools==='function'&&animUkScenePools([{county:'norfolk',ukTown:'Reepham'}],ctx).nearby.length>0))},()=>data||(data=fn()));
  });
}
(function(){if(typeof animRegisterPack!=='function')return;
  animRegisterPack({id:'uk-east-reepham',name:'UK: Reepham',version:'1.0.0',
    description:'Four hand-composed views of Reepham: Market Place, the shared churchyard, Marriott\'s Way and Whitwell railway. Live sky and engine seasons.',items:sceneUkReephamItems()});
})();
