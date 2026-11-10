// Deliberate mechanics update; automatic startup never runs this migration.
import {runIfMain} from './_lib.mjs';
import {run as runIslandUpdate,prepareGardenIslandUpdate,commitGardenIslandUpdate} from './100-garden-island-v3.mjs';
export const id='101-garden-mechanics-side-piers-v1';
export const description='Use the deliberate side-pier mechanics identity while retaining complete Garden placements and progress.';
export const auto=false;
export {prepareGardenIslandUpdate,commitGardenIslandUpdate};
export async function run(ctx){return runIslandUpdate(ctx)}
await runIfMain(import.meta.url,{id,description,auto,run});
