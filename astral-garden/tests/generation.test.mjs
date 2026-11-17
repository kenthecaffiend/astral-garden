import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCatalog,featured} from '../dist/generation.mjs';

test('a shared seed reproduces the exact celestial catalogue',()=>{
 for(const seed of [0,1,2402,4294967295]) assert.deepEqual(generateCatalog(seed),generateCatalog(seed));
 assert.notDeepEqual(generateCatalog(123),generateCatalog(124));
});
test('many seeds retain crowded, varied universes and the featured landmarks',()=>{
 for(let seed=0;seed<30;seed++){
  const bodies=generateCatalog(seed*14971);
  assert.ok(bodies.length>180,`seed ${seed} too sparse`);
  assert.equal(new Set(bodies.map(b=>b.kind)).size,6);
  for(const f of featured){const b=bodies.find(b=>b.name===f.name);assert.ok(b);assert.deepEqual(b.position,f.position);assert.equal(b.radius,f.radius);}
 }
});
test('generated celestial surfaces never overlap and all values are finite',()=>{
 for(const seed of [0,1,2,2402,4294967295]){
  const bodies=generateCatalog(seed);
  for(let i=0;i<bodies.length;i++){
   const a=bodies[i];assert.ok(a.radius>0);assert.ok(a.position.every(Number.isFinite));
   for(let j=i+1;j<bodies.length;j++){const b=bodies[j];const distance=Math.hypot(...a.position.map((n,k)=>n-b.position[k]));assert.ok(distance>a.radius+b.radius,`${a.name} overlaps ${b.name}`);}
  }
 }
});
test('destination arrival points are not inside a generated world',()=>{
 const arrivals=[[0,32,140],[655,95,-120],[-514,64,-295],[-350,-15,490],[420,185,580],[900,-108,475]];
 for(let seed=0;seed<20;seed++)for(const b of generateCatalog(seed))for(const p of arrivals){assert.ok(Math.hypot(...b.position.map((x,i)=>x-p[i]))>b.radius+2);}
});
