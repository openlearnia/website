/**
 * ponytail: assert Blender ward7.glb naming + AABB collision — fails if map regresses.
 * Run: npx --yes tsx src/games/horror-ward/blenderWard.check.ts
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
import { hitsAnyAabb, PLAYER_RADIUS, type Aabb2 } from './wardMap.ts';
import { COL_TO_BLOCKER, INTERACT_NAME_TO_ID } from './blenderWard.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const here = dirname(fileURLToPath(import.meta.url));
const glbPath = resolve(here, '../../../public/games/horror-ward/assets/maps/ward7.glb');
const buf = readFileSync(glbPath);

await new Promise<void>((resolvePromise, reject) => {
  new GLTFLoader().parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    '',
    (gltf) => {
      try {
        let cols = 0;
        let floors = 0;
        const walls: Aabb2[] = [];
        const blockers = new Map<string, Aabb2>();
        const spawn = new Vector3();
        let hasSpawn = false;
        const interacts = new Set<string>();

        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((o) => {
          if (o.name.startsWith('Floor_')) floors += 1;
          if (o.name.startsWith('Col_')) {
            cols += 1;
            const box = new Box3().setFromObject(o);
            const h = box.max.y - box.min.y;
            if (h < 0.35 || box.isEmpty()) return;
            const aabb: Aabb2 = {
              id: o.name,
              minX: box.min.x,
              maxX: box.max.x,
              minZ: box.min.z,
              maxZ: box.max.z,
            };
            const bid = COL_TO_BLOCKER[o.name];
            if (bid) blockers.set(bid, aabb);
            else walls.push(aabb);
          }
          if (o.name.startsWith('Spawn_Player')) {
            o.getWorldPosition(spawn);
            hasSpawn = true;
          }
          if (o.name.startsWith('Interact_') && INTERACT_NAME_TO_ID[o.name]) {
            interacts.add(INTERACT_NAME_TO_ID[o.name]);
          }
        });

        assert(floors >= 8, `expected Floor_* rooms, got ${floors}`);
        assert(cols >= 40, `expected Col_* meshes, got ${cols}`);
        assert(walls.length >= 20, `expected static wall AABBs, got ${walls.length}`);
        assert(blockers.has('bay_b_gate'), 'Col_Door_BayB_Gate → bay_b_gate blocker');
        assert(hasSpawn, 'Spawn_Player required');
        assert(Math.hypot(spawn.x, spawn.z - 2) < 0.5, `Spawn_Player near (0,2), got ${spawn.x},${spawn.z}`);
        assert(interacts.has('ups'), 'Interact_UPS required');
        assert(!hitsAnyAabb(0, 4, walls, PLAYER_RADIUS), 'lobby center must be clear of Col_*');
        assert(hitsAnyAabb(3.5, 4, walls, PLAYER_RADIUS), 'lobby east wall must block');

        console.log('blenderWard.check.ts OK', {
          cols,
          floors,
          walls: walls.length,
          blockers: [...blockers.keys()],
          interacts: [...interacts],
          spawn: { x: spawn.x, y: spawn.y, z: spawn.z },
        });
        resolvePromise();
      } catch (e) {
        reject(e);
      }
    },
    reject,
  );
});
