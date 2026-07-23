/**
 * Tiny self-check: global light pref + mode intensities stay coherent.
 * Run: npx --yes tsx src/games/horror-ward/lighting.check.ts
 */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  applyHorrorLighting,
  GLOBAL_LIGHT_STORAGE_KEY,
  loadGlobalLightPref,
  makeRoomLight,
  saveGlobalLightPref,
} from './lighting';

const mem = new Map<string, string>();
const ls = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
};
(globalThis as { localStorage?: typeof ls }).localStorage = ls;

saveGlobalLightPref(true);
assert.equal(mem.get(GLOBAL_LIGHT_STORAGE_KEY), '1');
assert.equal(loadGlobalLightPref(), true);
saveGlobalLightPref(false);
assert.equal(loadGlobalLightPref(), false);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a1210, 0.028);
const lighting = applyHorrorLighting(scene);
const room = makeRoomLight({ kind: 'warm', x: 0, z: 0, intensity: 1 });
lighting.addRoomLight(room);

assert.equal(lighting.hemi.intensity, 0.22);
assert.equal(lighting.fill.intensity, 0);
assert.equal(room.intensity, 1);

lighting.setGlobalLighting(true);
assert.equal(loadGlobalLightPref(), true);
assert.ok(lighting.hemi.intensity > 1.2);
assert.ok(lighting.ambient.intensity > 0.9);
assert.ok(lighting.fill.intensity > 0.7);
assert.ok(room.intensity > 2);
assert.ok((scene.fog as THREE.FogExp2).density < 0.02);

lighting.setGlobalLighting(false);
assert.equal(lighting.hemi.intensity, 0.22);
assert.equal(lighting.fill.intensity, 0);
assert.equal(room.intensity, 1);

lighting.dispose();
console.log('lighting.check.ts: ok');
