import test from 'node:test';
import assert from 'node:assert/strict';
import {planetVisibility,cometEnvelope} from '../dist/effects.mjs';
test('nearby surfaces stay crisp, distant worlds disappear monotonically',()=>{assert.equal(planetVisibility(100,20),1);assert.equal(planetVisibility(220,20),1);assert.equal(planetVisibility(1320,20),0);let last=1;for(let d=0;d<1800;d++){const fade=planetVisibility(d,20);assert.ok(fade>=0&&fade<=1);assert.ok(fade<=last);last=fade;}assert.ok(planetVisibility(700,30)>planetVisibility(1000,30));});
test('visibility measures distance to surface and has smooth endpoints',()=>{assert.equal(planetVisibility(720,20),planetVisibility(800,100));assert.ok(1-planetVisibility(221,20)<.00001);assert.ok(planetVisibility(1319,20)<.00001);});
test('comets ease into view, remain visible, and fade out before recycling',()=>{assert.equal(cometEnvelope(-1,14),0);assert.equal(cometEnvelope(0,14),0);assert.equal(cometEnvelope(.4,14),.5);assert.equal(cometEnvelope(7,14),1);assert.equal(cometEnvelope(13,14),.5);assert.equal(cometEnvelope(14,14),0);});
