import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {makeLightUniforms,updateLights} from '../dist/lighting.js';
const body=(x,y,z,radius)=>({mesh:{position:new T.Vector3(x,y,z),userData:{}},radius,lighting:makeLightUniforms()});
test('light selection follows stellar irradiance and keeps physical eclipse blockers',()=>{
 const world=body(0,0,0,5),moon=body(50,0,0,2),proxy=body(75,0,0,45);proxy.mesh.userData.binary=true;
 const star={position:new T.Vector3(100,0,0),radius:10,color:new T.Color(1,.4,.2)},secondary={position:new T.Vector3(0,200,0),radius:3,color:new T.Color(.2,.5,1)};
 updateLights([world,moon,proxy],[secondary,star]);
 assert.deepEqual(world.lighting.lightPositions.value[0].toArray(),[100,0,0]);
 const shadows=world.lighting.occluders.value;
 assert.ok(shadows.some(v=>v.x===50&&v.w===2));
 assert.ok(shadows.every(v=>v.w!==45),'Invisible binary barycentre cannot cast a shadow');
 star.position.set(1000,0,0);updateLights([world,moon,proxy],[secondary,star]);
 assert.deepEqual(world.lighting.lightPositions.value[0].toArray(),[0,200,0]);
});
