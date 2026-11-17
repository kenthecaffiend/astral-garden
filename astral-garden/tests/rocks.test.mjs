import test from 'node:test';
import assert from 'node:assert/strict';
import {rockGeometry} from '../dist/rocks.js';
test('close asteroid geometry adds silhouette detail with finite smooth normals',()=>{const distant=rockGeometry(2),close=rockGeometry(7);assert.ok(close.index.count>distant.index.count*5);assert.ok(close.index.count>close.attributes.position.count);for(const g of [distant,close]){for(const n of g.attributes.normal.array)assert.ok(Number.isFinite(n));g.computeBoundingSphere();assert.ok(g.boundingSphere.radius<1.3);}});
