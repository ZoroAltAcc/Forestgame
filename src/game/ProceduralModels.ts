import * as THREE from 'three';

// Procedural Low-Poly Asset Generators
// All models are custom geometry with faceted shading

const sharedMaterials = {
  skin: new THREE.MeshLambertMaterial({ color: 0xffcca6, flatShading: true }),
  beanie: new THREE.MeshLambertMaterial({ color: 0xd9534f, flatShading: true }),
  jacket: new THREE.MeshLambertMaterial({ color: 0x3d5a40, flatShading: true }),
  pants: new THREE.MeshLambertMaterial({ color: 0x2b2b2b, flatShading: true }),
  boots: new THREE.MeshLambertMaterial({ color: 0x4a3525, flatShading: true }),
  pack: new THREE.MeshLambertMaterial({ color: 0x8b5a2b, flatShading: true }),
  
  wood: new THREE.MeshLambertMaterial({ color: 0x5c4033, flatShading: true }),
  woodLight: new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x2d4a22, flatShading: true }),
  leavesLight: new THREE.MeshLambertMaterial({ color: 0x4a7c3f, flatShading: true }),
  pineLeaves: new THREE.MeshLambertMaterial({ color: 0x1b381a, flatShading: true }),
  
  stone: new THREE.MeshLambertMaterial({ color: 0x737577, flatShading: true }),
  darkStone: new THREE.MeshLambertMaterial({ color: 0x4f5254, flatShading: true }),
  
  iron: new THREE.MeshLambertMaterial({ color: 0xd1d5db, flatShading: true }),
  
  deerFur: new THREE.MeshLambertMaterial({ color: 0xa0653c, flatShading: true }),
  deerWhite: new THREE.MeshLambertMaterial({ color: 0xeaeaea, flatShading: true }),
  
  rabbitFur: new THREE.MeshLambertMaterial({ color: 0xc9b896, flatShading: true }),
  rabbitPink: new THREE.MeshLambertMaterial({ color: 0xffaaaa, flatShading: true }),
  
  zombieSkin: new THREE.MeshLambertMaterial({ color: 0x557a55, flatShading: true }),
  zombieShirt: new THREE.MeshLambertMaterial({ color: 0x334e68, flatShading: true }),
  glowingEyeGreen: new THREE.MeshBasicMaterial({ color: 0x39ff14 }),
  glowingEyeRed: new THREE.MeshBasicMaterial({ color: 0xff073a }),
  
  spiderBody: new THREE.MeshLambertMaterial({ color: 0x1a1515, flatShading: true }),
  
  fireInner: new THREE.MeshBasicMaterial({ color: 0xff9900 }),
  fireOuter: new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 }),
  
  meatRaw: new THREE.MeshLambertMaterial({ color: 0xcc3333, flatShading: true }),
  meatCooked: new THREE.MeshLambertMaterial({ color: 0x8b4513, flatShading: true }),
  
  carrotOrange: new THREE.MeshLambertMaterial({ color: 0xff7f27, flatShading: true }),
  carrotGreen: new THREE.MeshLambertMaterial({ color: 0x2d5016, flatShading: true }),
  
  flowerPink: new THREE.MeshLambertMaterial({ color: 0xff69b4, flatShading: true }),
  flowerYellow: new THREE.MeshLambertMaterial({ color: 0xffd700, flatShading: true }),
  flowerWhite: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
  flowerBlue: new THREE.MeshLambertMaterial({ color: 0x6495ed, flatShading: true }),
  flowerStem: new THREE.MeshLambertMaterial({ color: 0x228b22, flatShading: true }),
  
  burning: new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 }),
};

export interface PlayerRig {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  toolSlot: THREE.Group;
}

// ─── PLAYER MODEL ───
export function createPlayerModel(): PlayerRig {
  const group = new THREE.Group();
  group.name = "PlayerCharacter";

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
  const torso = new THREE.Mesh(torsoGeo, sharedMaterials.jacket);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);

  // Backpack
  const packGeo = new THREE.BoxGeometry(0.5, 0.7, 0.25);
  const pack = new THREE.Mesh(packGeo, sharedMaterials.pack);
  pack.position.set(0, 1.1, -0.3);
  pack.castShadow = true;
  group.add(pack);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.6, 0);

  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMesh = new THREE.Mesh(headGeo, sharedMaterials.skin);
  headMesh.position.y = 0.25;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Beanie
  const beanieGeo = new THREE.ConeGeometry(0.32, 0.4, 6);
  const beanie = new THREE.Mesh(beanieGeo, sharedMaterials.beanie);
  beanie.position.set(0, 0.6, 0);
  beanie.rotation.z = 0.1;
  headGroup.add(beanie);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.12, 0.3, 0.26);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(-0.12, 0.3, 0.26);
  headGroup.add(leftEye, rightEye);

  group.add(headGroup);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
  armGeo.translate(0, -0.35, 0);

  const leftArm = new THREE.Group();
  leftArm.position.set(0.48, 1.5, 0);
  leftArm.add(new THREE.Mesh(armGeo, sharedMaterials.jacket));
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(-0.48, 1.5, 0);
  rightArm.add(new THREE.Mesh(armGeo, sharedMaterials.jacket));
  group.add(rightArm);

  const toolSlot = new THREE.Group();
  toolSlot.position.set(0, -0.7, 0);
  rightArm.add(toolSlot);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.28, 0.7, 0.28);
  legGeo.translate(0, -0.35, 0);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.2, 0.7, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, sharedMaterials.pants);
  leftLeg.add(leftLegMesh);
  const bootGeo = new THREE.BoxGeometry(0.3, 0.15, 0.35);
  const leftBoot = new THREE.Mesh(bootGeo, sharedMaterials.boots);
  leftBoot.position.set(0, -0.65, 0.03);
  leftLeg.add(leftBoot);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.2, 0.7, 0);
  rightLeg.add(new THREE.Mesh(legGeo, sharedMaterials.pants));
  const rightBoot = new THREE.Mesh(bootGeo, sharedMaterials.boots);
  rightBoot.position.set(0, -0.65, 0.03);
  rightLeg.add(rightBoot);
  group.add(rightLeg);

  return { group, leftArm, rightArm, leftLeg, rightLeg, head: headGroup, toolSlot };
}

// ─── TOOLS ───
export function createAxeModel(): THREE.Group {
  const axe = new THREE.Group();
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5);
  const handle = new THREE.Mesh(handleGeo, sharedMaterials.wood);
  handle.position.y = 0.4;
  axe.add(handle);

  const headGeo = new THREE.BoxGeometry(0.3, 0.4, 0.08);
  const headMesh = new THREE.Mesh(headGeo, sharedMaterials.iron);
  headMesh.position.set(0.12, 0.75, 0);
  axe.add(headMesh);

  // Blade edge
  const bladeGeo = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0.27, 0.55, 0, 0.27, 0.95, 0, 0.4, 0.75, 0
  ]);
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  bladeGeo.computeVertexNormals();
  const blade = new THREE.Mesh(bladeGeo, sharedMaterials.iron);
  axe.add(blade);

  axe.rotation.x = Math.PI / 2;
  return axe;
}

export function createPickaxeModel(): THREE.Group {
  const pick = new THREE.Group();
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5);
  const handle = new THREE.Mesh(handleGeo, sharedMaterials.wood);
  handle.position.y = 0.4;
  pick.add(handle);

  const headGeo = new THREE.CylinderGeometry(0.02, 0.08, 0.7, 4);
  const headMesh = new THREE.Mesh(headGeo, sharedMaterials.iron);
  headMesh.position.set(0, 0.75, 0);
  headMesh.rotation.z = Math.PI / 2;
  pick.add(headMesh);

  pick.rotation.x = Math.PI / 2;
  return pick;
}

// ─── WORKBENCH ───
export function createWorkbenchModel(): THREE.Group {
  const bench = new THREE.Group();
  
  // Table top
  const topGeo = new THREE.BoxGeometry(1.2, 0.15, 0.8);
  const top = new THREE.Mesh(topGeo, sharedMaterials.woodLight);
  top.position.y = 0.9;
  top.castShadow = true;
  bench.add(top);
  
  // Grid pattern on top
  const gridGeo = new THREE.BoxGeometry(1.1, 0.02, 0.7);
  const gridMat = new THREE.MeshLambertMaterial({ color: 0x5a3d2b, flatShading: true });
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.position.y = 0.99;
  bench.add(grid);
  
  // Legs
  const legGeo = new THREE.BoxGeometry(0.15, 0.85, 0.15);
  const positions = [
    [-0.45, 0.425, -0.25], [0.45, 0.425, -0.25],
    [-0.45, 0.425, 0.25], [0.45, 0.425, 0.25]
  ];
  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, sharedMaterials.wood);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    bench.add(leg);
  });
  
  // Tools decoration
  const hammerGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08);
  const hammer = new THREE.Mesh(hammerGeo, sharedMaterials.iron);
  hammer.position.set(-0.3, 1.05, 0.2);
  hammer.rotation.z = 0.3;
  bench.add(hammer);
  
  return bench;
}

// ─── ANIMALS ───
export interface AnimalRig {
  group: THREE.Group;
  frontLeftLeg: THREE.Mesh;
  frontRightLeg: THREE.Mesh;
  backLeftLeg: THREE.Mesh;
  backRightLeg: THREE.Mesh;
  head: THREE.Group;
}

export function createDeerModel(): AnimalRig {
  const group = new THREE.Group();
  
  const bodyGeo = new THREE.BoxGeometry(0.6, 0.7, 1.4);
  const body = new THREE.Mesh(bodyGeo, sharedMaterials.deerFur);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  const tailGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const tail = new THREE.Mesh(tailGeo, sharedMaterials.deerWhite);
  tail.position.set(0, 1.2, -0.75);
  group.add(tail);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.2, 0.6);
  
  const neckGeo = new THREE.BoxGeometry(0.25, 0.6, 0.3);
  const neck = new THREE.Mesh(neckGeo, sharedMaterials.deerFur);
  neck.position.set(0, 0.3, 0);
  headGroup.add(neck);

  const snoutGeo = new THREE.BoxGeometry(0.3, 0.35, 0.5);
  const snout = new THREE.Mesh(snoutGeo, sharedMaterials.deerFur);
  snout.position.set(0, 0.5, 0.3);
  headGroup.add(snout);

  // Antlers
  const antlerGeo = new THREE.ConeGeometry(0.04, 0.5, 4);
  const leftAntler = new THREE.Mesh(antlerGeo, sharedMaterials.wood);
  leftAntler.position.set(0.15, 0.9, 0.1);
  leftAntler.rotation.z = -0.3;
  const rightAntler = new THREE.Mesh(antlerGeo, sharedMaterials.wood);
  rightAntler.position.set(-0.15, 0.9, 0.1);
  rightAntler.rotation.z = 0.3;
  headGroup.add(leftAntler, rightAntler);

  group.add(headGroup);

  const legGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
  
  const frontLeftLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  frontLeftLeg.position.set(0.2, 0.35, 0.4);
  group.add(frontLeftLeg);

  const frontRightLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  frontRightLeg.position.set(-0.2, 0.35, 0.4);
  group.add(frontRightLeg);

  const backLeftLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  backLeftLeg.position.set(0.2, 0.35, -0.4);
  group.add(backLeftLeg);

  const backRightLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  backRightLeg.position.set(-0.2, 0.35, -0.4);
  group.add(backRightLeg);

  return { group, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg, head: headGroup };
}

export function createRabbitModel(): AnimalRig {
  const group = new THREE.Group();
  
  // Body
  const bodyGeo = new THREE.SphereGeometry(0.25, 6, 5);
  const body = new THREE.Mesh(bodyGeo, sharedMaterials.rabbitFur);
  body.position.y = 0.3;
  body.scale.set(1, 0.8, 1.2);
  body.castShadow = true;
  group.add(body);
  
  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.4, 0.25);
  
  const headGeo = new THREE.SphereGeometry(0.15, 6, 5);
  const head = new THREE.Mesh(headGeo, sharedMaterials.rabbitFur);
  headGroup.add(head);
  
  // Ears
  const earGeo = new THREE.ConeGeometry(0.05, 0.25, 4);
  const leftEar = new THREE.Mesh(earGeo, sharedMaterials.rabbitFur);
  leftEar.position.set(0.08, 0.2, 0);
  leftEar.rotation.z = 0.2;
  const leftEarInner = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 4), sharedMaterials.rabbitPink);
  leftEarInner.position.set(0.08, 0.2, 0.01);
  leftEarInner.rotation.z = 0.2;
  headGroup.add(leftEar, leftEarInner);
  
  const rightEar = new THREE.Mesh(earGeo, sharedMaterials.rabbitFur);
  rightEar.position.set(-0.08, 0.2, 0);
  rightEar.rotation.z = -0.2;
  const rightEarInner = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 4), sharedMaterials.rabbitPink);
  rightEarInner.position.set(-0.08, 0.2, 0.01);
  rightEarInner.rotation.z = -0.2;
  headGroup.add(rightEar, rightEarInner);
  
  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.08, 0.05, 0.1);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(-0.08, 0.05, 0.1);
  headGroup.add(leftEye, rightEye);
  
  // Nose
  const noseGeo = new THREE.SphereGeometry(0.025, 4, 4);
  const nose = new THREE.Mesh(noseGeo, sharedMaterials.rabbitPink);
  nose.position.set(0, 0, 0.14);
  headGroup.add(nose);
  
  group.add(headGroup);
  
  // Legs (small)
  const legGeo = new THREE.BoxGeometry(0.06, 0.15, 0.08);
  
  const frontLeftLeg = new THREE.Mesh(legGeo, sharedMaterials.rabbitFur);
  frontLeftLeg.position.set(0.1, 0.08, 0.15);
  group.add(frontLeftLeg);

  const frontRightLeg = new THREE.Mesh(legGeo, sharedMaterials.rabbitFur);
  frontRightLeg.position.set(-0.1, 0.08, 0.15);
  group.add(frontRightLeg);

  const backLeftLeg = new THREE.Mesh(legGeo, sharedMaterials.rabbitFur);
  backLeftLeg.position.set(0.12, 0.08, -0.15);
  backLeftLeg.scale.set(1.2, 1.5, 1.5);
  group.add(backLeftLeg);

  const backRightLeg = new THREE.Mesh(legGeo, sharedMaterials.rabbitFur);
  backRightLeg.position.set(-0.12, 0.08, -0.15);
  backRightLeg.scale.set(1.2, 1.5, 1.5);
  group.add(backRightLeg);
  
  // Fluffy tail
  const tailGeo = new THREE.SphereGeometry(0.08, 5, 4);
  const rabbitTail = new THREE.Mesh(tailGeo, sharedMaterials.rabbitFur);
  rabbitTail.position.set(0, 0.3, -0.3);
  group.add(rabbitTail);

  return { group, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg, head: headGroup };
}

// ─── ENEMIES ───
export interface EnemyRig {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

export function createZombieModel(): EnemyRig {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.6, 0.9, 0.35);
  const body = new THREE.Mesh(bodyGeo, sharedMaterials.zombieShirt);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.BoxGeometry(0.5, 0.55, 0.45);
  const head = new THREE.Mesh(headGeo, sharedMaterials.zombieSkin);
  head.position.set(0, 1.85, 0);
  group.add(head);

  // Glowing eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
  const leftEye = new THREE.Mesh(eyeGeo, sharedMaterials.glowingEyeGreen);
  leftEye.position.set(0.12, 1.9, 0.23);
  const rightEye = new THREE.Mesh(eyeGeo, sharedMaterials.glowingEyeGreen);
  rightEye.position.set(-0.12, 1.9, 0.23);
  group.add(leftEye, rightEye);

  const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
  armGeo.translate(0, -0.32, 0);

  const leftArm = new THREE.Group();
  leftArm.position.set(0.42, 1.45, 0);
  leftArm.add(new THREE.Mesh(armGeo, sharedMaterials.zombieSkin));
  leftArm.rotation.x = -0.8;
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(-0.42, 1.45, 0);
  rightArm.add(new THREE.Mesh(armGeo, sharedMaterials.zombieSkin));
  rightArm.rotation.x = -0.8;
  group.add(rightArm);

  const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
  legGeo.translate(0, -0.3, 0);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.18, 0.6, 0);
  leftLeg.add(new THREE.Mesh(legGeo, sharedMaterials.pants));
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.18, 0.6, 0);
  rightLeg.add(new THREE.Mesh(legGeo, sharedMaterials.pants));
  group.add(rightLeg);

  return { group, leftArm, rightArm, leftLeg, rightLeg };
}

export function createSpiderModel(): THREE.Group {
  const group = new THREE.Group();

  const abdomenGeo = new THREE.SphereGeometry(0.5, 6, 5);
  const abdomen = new THREE.Mesh(abdomenGeo, sharedMaterials.spiderBody);
  abdomen.position.set(0, 0.5, -0.3);
  abdomen.scale.set(1, 0.7, 1.2);
  group.add(abdomen);

  const thoraxGeo = new THREE.SphereGeometry(0.35, 6, 5);
  const thorax = new THREE.Mesh(thoraxGeo, sharedMaterials.spiderBody);
  thorax.position.set(0, 0.45, 0.3);
  group.add(thorax);

  // Red eyes
  const eyeGeo = new THREE.SphereGeometry(0.08, 4, 4);
  for (let i = 0; i < 4; i++) {
    const eye = new THREE.Mesh(eyeGeo, sharedMaterials.glowingEyeRed);
    eye.position.set((i % 2 === 0 ? 0.1 : -0.1), 0.55, 0.55 + (i < 2 ? 0.05 : -0.05));
    group.add(eye);
  }

  // 8 Legs
  const legGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 4);
  for (let i = 0; i < 8; i++) {
    const leg = new THREE.Mesh(legGeo, sharedMaterials.spiderBody);
    const side = i < 4 ? 1 : -1;
    const idx = i % 4;
    leg.position.set(side * 0.35, 0.4, 0.3 - idx * 0.2);
    leg.rotation.z = side * (0.5 + idx * 0.1);
    leg.rotation.x = (idx - 1.5) * 0.15;
    leg.name = `spider_leg_${i}`;
    group.add(leg);
  }

  return group;
}

// ─── BURNING EFFECT OVERLAY ───
export function createBurningEffect(): THREE.Group {
  const group = new THREE.Group();
  group.name = "BurningEffect";
  
  // Fire particles around the entity
  for (let i = 0; i < 6; i++) {
    const flameGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const flame = new THREE.Mesh(flameGeo, sharedMaterials.fireOuter);
    const angle = (i / 6) * Math.PI * 2;
    flame.position.set(Math.cos(angle) * 0.3, 0.5 + Math.random() * 0.5, Math.sin(angle) * 0.3);
    flame.name = `flame_${i}`;
    group.add(flame);
  }
  
  // Inner bright core
  const coreGeo = new THREE.SphereGeometry(0.3, 5, 4);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ 
    color: 0xffaa00, 
    transparent: true, 
    opacity: 0.5 
  }));
  core.position.y = 0.8;
  core.name = "fireCore";
  group.add(core);
  
  return group;
}

// ─── TREES ───
export function createStylizedTree(scale: number = 1, treeType: 'oak' | 'pine' | 'birch' = 'oak'): THREE.Group {
  const tree = new THREE.Group();
  
  const trunkHeight = (treeType === 'pine' ? 4.0 : 3.0) * scale;
  const trunkColor = treeType === 'birch' ? 0xeeeeee : 0x5c4033;
  const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor, flatShading: true });
  
  const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, trunkHeight, 6);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);
  
  // Birch stripes
  if (treeType === 'birch') {
    for (let i = 0; i < 4; i++) {
      const stripeGeo = new THREE.BoxGeometry(0.25 * scale, 0.08 * scale, 0.05 * scale);
      const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true }));
      stripe.position.set(0, 0.5 + i * 0.7 * scale, 0.15 * scale);
      stripe.rotation.y = Math.random() * 0.5;
      tree.add(stripe);
    }
  }

  if (treeType === 'pine') {
    for (let i = 0; i < 5; i++) {
      const coneSize = (1.4 - i * 0.25) * scale;
      const coneGeo = new THREE.ConeGeometry(coneSize, 1.0 * scale, 6);
      const cone = new THREE.Mesh(coneGeo, sharedMaterials.pineLeaves);
      cone.position.y = trunkHeight - 0.3 + i * 0.6 * scale;
      cone.castShadow = true;
      tree.add(cone);
    }
  } else {
    const canopyGeo = new THREE.IcosahedronGeometry(1.8 * scale, 0);
    const canopyMat = treeType === 'birch' ? sharedMaterials.leavesLight : sharedMaterials.leaves;
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = trunkHeight + 0.8 * scale;
    canopy.castShadow = true;
    tree.add(canopy);

    // Extra foliage
    for (let i = 0; i < 4; i++) {
      const extraGeo = new THREE.IcosahedronGeometry(0.9 * scale, 0);
      const extra = new THREE.Mesh(extraGeo, canopyMat);
      const angle = (i / 4) * Math.PI * 2;
      extra.position.set(
        Math.cos(angle) * 1.0 * scale,
        trunkHeight + 0.3 * scale,
        Math.sin(angle) * 1.0 * scale
      );
      extra.castShadow = true;
      tree.add(extra);
    }
  }

  return tree;
}

// ─── ROCKS ───
export function createStylizedRock(scale: number = 1, isDark: boolean = false): THREE.Mesh {
  const rockGeo = new THREE.DodecahedronGeometry(scale, 0);
  
  const positions = rockGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const noise = 0.8 + Math.random() * 0.4;
    positions.setXYZ(i, x * noise, y * noise, z * noise);
  }
  rockGeo.computeVertexNormals();

  const rock = new THREE.Mesh(rockGeo, isDark ? sharedMaterials.darkStone : sharedMaterials.stone);
  rock.castShadow = true;
  return rock;
}

// ─── FLOWERS ───
export function createFlowerModel(colorType: 'pink' | 'yellow' | 'white' | 'blue' = 'pink'): THREE.Group {
  const flower = new THREE.Group();
  
  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4);
  const stem = new THREE.Mesh(stemGeo, sharedMaterials.flowerStem);
  stem.position.y = 0.2;
  flower.add(stem);
  
  // Petals
  const petalMat = {
    pink: sharedMaterials.flowerPink,
    yellow: sharedMaterials.flowerYellow,
    white: sharedMaterials.flowerWhite,
    blue: sharedMaterials.flowerBlue,
  }[colorType];
  
  for (let i = 0; i < 5; i++) {
    const petalGeo = new THREE.SphereGeometry(0.08, 4, 4);
    const petal = new THREE.Mesh(petalGeo, petalMat);
    const angle = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.1, 0.42, Math.sin(angle) * 0.1);
    petal.scale.set(1, 0.5, 1);
    flower.add(petal);
  }
  
  // Center
  const centerGeo = new THREE.SphereGeometry(0.05, 4, 4);
  const centerMat = new THREE.MeshLambertMaterial({ color: 0xffcc00, flatShading: true });
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.position.y = 0.42;
  flower.add(center);
  
  return flower;
}

// ─── CARROT ───
export function createCarrotModel(): THREE.Group {
  const carrot = new THREE.Group();
  
  // Orange root
  const rootGeo = new THREE.ConeGeometry(0.08, 0.35, 5);
  const root = new THREE.Mesh(rootGeo, sharedMaterials.carrotOrange);
  root.position.y = 0.12;
  root.rotation.x = Math.PI;
  carrot.add(root);
  
  // Green top
  for (let i = 0; i < 3; i++) {
    const leafGeo = new THREE.ConeGeometry(0.02, 0.2, 3);
    const leaf = new THREE.Mesh(leafGeo, sharedMaterials.carrotGreen);
    leaf.position.set((i - 1) * 0.03, 0.3, 0);
    leaf.rotation.z = (i - 1) * 0.2;
    carrot.add(leaf);
  }
  
  return carrot;
}

// ─── STRUCTURES ───
export function createCampfireModel(): THREE.Group {
  const campfire = new THREE.Group();

  // Stone ring
  for (let i = 0; i < 8; i++) {
    const stoneGeo = new THREE.BoxGeometry(0.3, 0.22, 0.3);
    const stone = new THREE.Mesh(stoneGeo, sharedMaterials.darkStone);
    const angle = (i / 8) * Math.PI * 2;
    stone.position.set(Math.cos(angle) * 0.55, 0.11, Math.sin(angle) * 0.55);
    stone.rotation.y = angle;
    campfire.add(stone);
  }

  // Wood logs
  for (let i = 0; i < 5; i++) {
    const logGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.7, 5);
    const log = new THREE.Mesh(logGeo, sharedMaterials.wood);
    const angle = (i / 5) * Math.PI * 2;
    log.position.set(Math.cos(angle) * 0.2, 0.15, Math.sin(angle) * 0.2);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = angle;
    campfire.add(log);
  }

  // Fire flames
  const flameGeo = new THREE.ConeGeometry(0.25, 0.7, 5);
  const flame = new THREE.Mesh(flameGeo, sharedMaterials.fireInner);
  flame.position.y = 0.5;
  flame.name = "CampfireFlame";
  campfire.add(flame);

  const innerFlameGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
  const innerFlame = new THREE.Mesh(innerFlameGeo, new THREE.MeshBasicMaterial({ color: 0xffdd00 }));
  innerFlame.position.y = 0.45;
  innerFlame.name = "CampfireInnerFlame";
  campfire.add(innerFlame);

  // Point light
  const fireLight = new THREE.PointLight(0xff6600, 2.5, 15);
  fireLight.position.y = 0.6;
  fireLight.name = "CampfireLight";
  campfire.add(fireLight);
  
  // Ember particles group
  const embersGroup = new THREE.Group();
  embersGroup.name = "Embers";
  for (let i = 0; i < 8; i++) {
    const emberGeo = new THREE.SphereGeometry(0.03, 3, 3);
    const ember = new THREE.Mesh(emberGeo, new THREE.MeshBasicMaterial({ color: 0xff4400 }));
    ember.position.set((Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
    ember.name = `ember_${i}`;
    embersGroup.add(ember);
  }
  campfire.add(embersGroup);

  return campfire;
}

export function createFurnaceModel(): THREE.Group {
  const furnace = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(1.0, 1.2, 0.8);
  const body = new THREE.Mesh(bodyGeo, sharedMaterials.darkStone);
  body.position.y = 0.6;
  body.castShadow = true;
  furnace.add(body);

  const openingGeo = new THREE.BoxGeometry(0.4, 0.5, 0.2);
  const opening = new THREE.Mesh(openingGeo, new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
  opening.position.set(0, 0.4, 0.35);
  furnace.add(opening);

  const glowGeo = new THREE.BoxGeometry(0.3, 0.4, 0.1);
  const glow = new THREE.Mesh(glowGeo, sharedMaterials.fireInner);
  glow.position.set(0, 0.4, 0.32);
  glow.name = "FurnaceGlow";
  furnace.add(glow);

  const chimneyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 6);
  const chimney = new THREE.Mesh(chimneyGeo, sharedMaterials.darkStone);
  chimney.position.set(0, 1.45, -0.2);
  furnace.add(chimney);

  return furnace;
}

// ─── DROPPED ITEMS ───
export function createMeatModel(cooked: boolean = false): THREE.Group {
  const meat = new THREE.Group();
  
  // Main meat chunk
  const chunkGeo = new THREE.BoxGeometry(0.25, 0.12, 0.35);
  const chunk = new THREE.Mesh(chunkGeo, cooked ? sharedMaterials.meatCooked : sharedMaterials.meatRaw);
  chunk.castShadow = true;
  meat.add(chunk);
  
  // Bone sticking out
  const boneGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.2, 4);
  const boneMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc, flatShading: true });
  const bone = new THREE.Mesh(boneGeo, boneMat);
  bone.position.set(0.15, 0, 0);
  bone.rotation.z = Math.PI / 2;
  meat.add(bone);
  
  // Bone knob
  const knobGeo = new THREE.SphereGeometry(0.04, 4, 4);
  const knob = new THREE.Mesh(knobGeo, boneMat);
  knob.position.set(0.25, 0, 0);
  meat.add(knob);
  
  return meat;
}

export function createWoodLogModel(): THREE.Group {
  const log = new THREE.Group();
  
  const mainGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 6);
  const main = new THREE.Mesh(mainGeo, sharedMaterials.wood);
  main.rotation.z = Math.PI / 2;
  main.castShadow = true;
  log.add(main);
  
  // Wood rings on ends
  const ringGeo = new THREE.CircleGeometry(0.1, 6);
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.position.set(0.25, 0, 0);
  ring1.rotation.y = Math.PI / 2;
  log.add(ring1);
  
  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.position.set(-0.25, 0, 0);
  ring2.rotation.y = -Math.PI / 2;
  log.add(ring2);
  
  return log;
}

export function createStoneModel(): THREE.Group {
  const group = new THREE.Group();
  const stoneGeo = new THREE.DodecahedronGeometry(0.15, 0);
  const stone = new THREE.Mesh(stoneGeo, sharedMaterials.stone);
  stone.castShadow = true;
  group.add(stone);
  return group;
}
