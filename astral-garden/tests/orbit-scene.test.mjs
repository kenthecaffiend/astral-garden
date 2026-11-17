import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createCosmos} from '../dist/celestials.js';
// Canvas is only needed for a decorative glow; orbital geometry is CPU-side.
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
for(const seed of [1,2402])test(`crowded scene ${seed} stays separated and moving for two minutes`,()=>{
 const cosmos=createCosmos(new T.Scene(),{},new T.PerspectiveCamera(),seed),o=cosmos.orbitSystem;
 for(let tick=0;tick<=2400;tick++){
  cosmos.advance(tick*.05);
  for(let i=0;i<o.nodes.length;i++)for(let j=0;j<i;j++){
   const a=o.nodes[i],b=o.nodes[j],distance=Math.hypot(...a.position.map((v,k)=>v-b.position[k]));
   assert.ok(distance>=a.bodyRadius+b.bodyRadius,`${a.id} overlaps ${b.id} at ${tick*.05}s`);
  }
 }
 assert.equal(o.heldTicks,0);
 for(const n of o.nodes.slice(1))assert.ok(n.phase>0,`${n.id} should keep moving`);
});
