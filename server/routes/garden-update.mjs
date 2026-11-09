// Deliberate same-account island migration/import; no automatic second-device
// restamp. The normal router retains host/origin/content-type/body safeguards.
import {createGardenUpdate} from '../../lib/garden-update.mjs';
export default function register(app){
 const service=createGardenUpdate(app.ctx);
 app.route({path:'/api/garden/update',method:'GET',quiet:true,handler:()=>service.inspect()});
 app.route({path:'/api/garden/update',method:'POST',maxBody:2048,handler:async c=>service.apply(await c.body())});
}
