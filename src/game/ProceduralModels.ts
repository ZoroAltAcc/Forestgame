import * as THREE from 'three';

// Procedural Low-Poly Asset Generators for CozyWood Survival
// Coherent stylized topology with faceted shading support.

const sharedMaterials = {
  skin: new THREE.MeshLambertMaterial({ color: 0xffcca6, flatShading: true }),
  beanie: new THREE.MeshLambertMaterial({ color: 0xd9534f, flatShading: true }), // cozy red beanie
  jacket: new THREE.MeshLambertMaterial({ color: 0x3d5a40, flatShading: true }), // dark forest green
  pants: new THREE.MeshLambertMaterial({ color: 0x2b2b2b, flatShading: true }),
  boots: new THREE.MeshLambertMaterial({ color: 0x4a3525, flatShading: true }),
  pack: new THREE.MeshLambertMaterial({ color: 0x8b5a2b, flatShading: true }),
  
  wood: new THREE.MeshLambertMaterial({ color: 0x5c4033, flatShading: true }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x2d4a22, flatShading: true }),
  pineLeaves: new THREE.MeshLambertMaterial({ color: 0x1b381a, flatShading: true }),
  
  stone: new THREE.MeshLambertMaterial({ color: 0x737577, flatShading: true }),
  darkStone: new THREE.MeshLambertMaterial({ color: 0x4f5254, flatShading: true }),
  
  iron: new THREE.MeshLambertMaterial({ color: 0xd1d5db, flatShading: true }),
  goldColor: new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
  
  deerFur: new THREE.MeshLambertMaterial({ color: 0xa0653c, flatShading: true }),
  deerWhite: new THREE.MeshLambertMaterial({ color: 0xeaeaea, flatShading: true }),
  
  zombieSkin: new THREE.MeshLambertMaterial({ color: 0x557a55, flatShading: true }),
  zombieShirt: new THREE.MeshLambertMaterial({ color: 0x334e68, flatShading: true }),
  glowingEyeGreen: new THREE.MeshBasicMaterial({ color: 0x39ff14 }),
  glowingEyeRed: new THREE.MeshBasicMaterial({ color: 0xff073a }),
  
  spiderBody: new THREE.MeshLambertMaterial({ color: 0x1a1515, flatShading: true }),
  
  fireInner: new THREE.MeshBasicMaterial({ color: 0xff9900 }),
  meatRaw: new THREE.MeshLambertMaterial({ color: 0xef4444, flatShading: true }),
  meatCooked: new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true }),
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

// 1. Build Multi-Part Fully Animated Character Model
export function createPlayerModel(): PlayerRig {
  const group = new THREE.Group();
  group.name = "PlayerCharacter";

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
  const torso = new THREE.Mesh(torsoGeo, sharedMaterials.jacket);
  torso.position.y = 1.1;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Backpack
  const packGeo = new THREE.BoxGeometry(0.5, 0.7, 0.25);
  const pack = new THREE.Mesh(packGeo, sharedMaterials.pack);
  pack.position.set(0, 1.1, -0.3);
  pack.castShadow = true;
  group.add(pack);

  // Head Pivot Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.6, 0);

  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMesh = new THREE.Mesh(headGeo, sharedMaterials.skin);
  headMesh.position.y = 0.25;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Cozy Knit Beanie
  const beanieGeo = new THREE.ConeGeometry(0.32, 0.4, 6);
  const beanie = new THREE.Mesh(beanieGeo, sharedMaterials.beanie);
  beanie.position.set(0, 0.6, 0);
  beanie.rotation.z = 0.1; // stylish tilt
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

  // Arms (Pivoted at shoulder)
  const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
  // Shift geometry so origin is at the top shoulder joint
  armGeo.translate(0, -0.35, 0);

  const leftArm = new THREE.Group();
  leftArm.position.set(0.48, 1.5, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, sharedMaterials.jacket);
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(-0.48, 1.5, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, sharedMaterials.jacket);
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  group.add(rightArm);

  // Hand attach slot for holding tools/weapons
  const toolSlot = new THREE.Group();
  toolSlot.position.set(0, -0.7, 0);
  rightArm.add(toolSlot);

  // Legs (Pivoted at hip)
  const legGeo = new THREE.BoxGeometry(0.28, 0.7, 0.28);
  legGeo.translate(0, -0.35, 0);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.2, 0.7, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, sharedMaterials.pants);
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);

  // Boots attached to legs
  const bootGeo = new THREE.BoxGeometry(0.3, 0.15, 0.35);
  const leftBoot = new THREE.Mesh(bootGeo, sharedMaterials.boots);
  leftBoot.position.set(0, -0.65, 0.03);
  leftLeg.add(leftBoot);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.2, 0.7, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, sharedMaterials.pants);
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);

  const rightBoot = new THREE.Mesh(bootGeo, sharedMaterials.boots);
  rightBoot.position.set(0, -0.65, 0.03);
  rightLeg.add(rightBoot);
  group.add(rightLeg);

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    head: headGroup,
    toolSlot
  };
}

// 2. Custom Tools (Attached to hands or dropped as pickups)
export function createAxeModel(): THREE.Group {
  const axe = new THREE.Group();
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5);
  const handle = new THREE.Mesh(handleGeo, sharedMaterials.wood);
  handle.position.y = 0.4;
  axe.add(handle);

  const headGeo = new THREE.ConeGeometry(0.2, 0.35, 4);
  const headMesh = new THREE.Mesh(headGeo, sharedMaterials.iron);
  headMesh.position.set(0, 0.7, 0.1);
  headMesh.rotation.x = Math.PI / 2;
  headMesh.rotation.z = Math.PI / 4;
  axe.add(headMesh);

  // Rotate entire group so it faces perfectly forward when hand swings
  axe.rotation.x = Math.PI / 2;
  return axe;
}

export function createPickaxeModel(): THREE.Group {
  const pick = new THREE.Group();
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5);
  const handle = new THREE.Mesh(handleGeo, sharedMaterials.wood);
  handle.position.y = 0.4;
  pick.add(handle);

  // Double ended sharp pick head
  const headGeo = new THREE.CylinderGeometry(0.02, 0.08, 0.7, 4);
  const headMesh = new THREE.Mesh(headGeo, sharedMaterials.iron);
  headMesh.position.set(0, 0.75, 0);
  headMesh.rotation.z = Math.PI / 2;
  pick.add(headMesh);

  pick.rotation.x = Math.PI / 2;
  return pick;
}

// 3. Custom Animated Deer Model
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
  
  // Body
  const bodyGeo = new THREE.BoxGeometry(0.6, 0.7, 1.4);
  const body = new THREE.Mesh(bodyGeo, sharedMaterials.deerFur);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  // Cute white tail
  const tailGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const tail = new THREE.Mesh(tailGeo, sharedMaterials.deerWhite);
  tail.position.set(0, 1.2, -0.75);
  group.add(tail);

  // Neck & Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.2, 0.6);
  
  const neckGeo = new THREE.BoxGeometry(0.25, 0.6, 0.3);
  const neck = new THREE.Mesh(neckGeo, sharedMaterials.deerFur);
  neck.position.set(0, 0.3, 0);
  headGroup.add(neck);

  const snoutGeo = new THREE.BoxGeometry(0.3, 0.25, 0.5);
  const snout = new THREE.Mesh(snoutGeo, sharedMaterials.deerFur);
  snout.position.set(0, 0.5, 0.2);
  headGroup.add(snout);

  // Antlers
  const antlerGeo = new THREE.ConeGeometry(0.05, 0.5, 4);
  const antlerL = new THREE.Mesh(antlerGeo, sharedMaterials.wood);
  antlerL.position.set(0.15, 0.8, 0);
  antlerL.rotation.z = -0.2;
  const antlerR = new THREE.Mesh(antlerGeo, sharedMaterials.wood);
  antlerR.position.set(-0.15, 0.8, 0);
  antlerR.rotation.z = 0.2;
  headGroup.add(antlerL, antlerR);

  group.add(headGroup);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.15, 0.8, 0.15);
  legGeo.translate(0, -0.4, 0);

  const frontLeftLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  frontLeftLeg.position.set(0.25, 0.7, 0.5);
  frontLeftLeg.castShadow = true;
  group.add(frontLeftLeg);

  const frontRightLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  frontRightLeg.position.set(-0.25, 0.7, 0.5);
  frontRightLeg.castShadow = true;
  group.add(frontRightLeg);

  const backLeftLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  backLeftLeg.position.set(0.25, 0.7, -0.5);
  backLeftLeg.castShadow = true;
  group.add(backLeftLeg);

  const backRightLeg = new THREE.Mesh(legGeo, sharedMaterials.deerFur);
  backRightLeg.position.set(-0.25, 0.7, -0.5);
  backRightLeg.castShadow = true;
  group.add(backRightLeg);

  return {
    group,
    frontLeftLeg,
    frontRightLeg,
    backLeftLeg,
    backRightLeg,
    head: headGroup
  };
}

// 4. Custom Stylized Zombie Rig
export interface EnemyRig {
  group: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
}

export function createZombieModel(): EnemyRig {
  const group = new THREE.Group();

  const torsoGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
  const torso = new THREE.Mesh(torsoGeo, sharedMaterials.zombieShirt);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);

  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeo, sharedMaterials.zombieSkin);
  head.position.set(0, 1.85, 0);
  head.rotation.y = 0.1; // tilted zombie stumble
  head.rotation.z = -0.1;
  head.castShadow = true;

  // Glowing Green Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const leftEye = new THREE.Mesh(eyeGeo, sharedMaterials.glowingEyeGreen);
  leftEye.position.set(0.12, 0.05, 0.26);
  const rightEye = new THREE.Mesh(eyeGeo, sharedMaterials.glowingEyeGreen);
  rightEye.position.set(-0.12, 0.05, 0.26);
  head.add(leftEye, rightEye);
  group.add(head);

  // Outstretched zombie arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  armGeo.translate(0, -0.35, 0);

  const leftArm = new THREE.Mesh(armGeo, sharedMaterials.zombieSkin);
  leftArm.position.set(0.45, 1.5, 0);
  leftArm.rotation.x = -Math.PI / 2 + 0.2; // arms pointing straight out
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, sharedMaterials.zombieSkin);
  rightArm.position.set(-0.45, 1.5, 0);
  rightArm.rotation.x = -Math.PI / 2 - 0.1;
  rightArm.castShadow = true;
  group.add(rightArm);

  const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
  legGeo.translate(0, -0.35, 0);

  const leftLeg = new THREE.Mesh(legGeo, sharedMaterials.pants);
  leftLeg.position.set(0.2, 0.7, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, sharedMaterials.pants);
  rightLeg.position.set(-0.2, 0.7, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  return { group, leftArm, rightArm, leftLeg, rightLeg };
}

// 5. Custom Segmented Giant Spider
export function createSpiderModel(): THREE.Group {
  const group = new THREE.Group();
  
  const bodyGeo = new THREE.SphereGeometry(0.5, 6, 5);
  const body = new THREE.Mesh(bodyGeo, sharedMaterials.spiderBody);
  body.position.set(0, 0.4, -0.2);
  body.scale.set(1.2, 0.8, 1.5);
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.3, 5, 5);
  const head = new THREE.Mesh(headGeo, sharedMaterials.spiderBody);
  head.position.set(0, 0.35, 0.4);
  group.add(head);

  // Glowing Crimson Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const leftEye = new THREE.Mesh(eyeGeo, sharedMaterials.glowingEyeRed);
  leftEye.position.set(0.1, 0.05, 0.25);
  const rightEye = new THREE.Mesh(eyeGeo, sharedMaterials.glowingEyeRed);
  rightEye.position.set(-0.1, 0.05, 0.25);
  head.add(leftEye, rightEye);

  // 8 segmented crawling legs
  const legGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
  legGeo.translate(0, -0.3, 0);

  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    const zPos = 0.3 - row * 0.2;
    
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.3, 0.4, zPos);
    
    // Angled outwards
    legGroup.rotation.z = side * -0.6;
    legGroup.rotation.y = (row - 1.5) * 0.2;
    
    const legMesh = new THREE.Mesh(legGeo, sharedMaterials.spiderBody);
    legMesh.castShadow = true;
    legGroup.add(legMesh);
    
    // Tag leg for procedural cycle animation
    legGroup.name = `spider_leg_${i}`;
    group.add(legGroup);
  }

  return group;
}

// 6. Custom Multi-Layered Stylized Pine/Fir Tree
export function createStylizedTree(heightScale = 1.0): THREE.Group {
  const tree = new THREE.Group();
  
  const trunkHeight = 1.5 + Math.random() * 1.0;
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, trunkHeight, 5);
  const trunk = new THREE.Mesh(trunkGeo, sharedMaterials.wood);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // Overlapping faceted foliage cones
  const layers = 3 + Math.floor(Math.random() * 2);
  let currentY = trunkHeight * 0.7;
  let currentRadius = 1.6;

  for (let i = 0; i < layers; i++) {
    const layerHeight = 1.8 - i * 0.2;
    const coneGeo = new THREE.ConeGeometry(currentRadius, layerHeight, 5);
    
    // Add light random displacement to vertices for organic stylized shape inspired by Valheim
    const posAttr = coneGeo.attributes.position;
    for (let j = 0; j < posAttr.count; j++) {
      if (posAttr.getY(j) < layerHeight / 2) { // only deform bottom skirt
        posAttr.setX(j, posAttr.getX(j) + (Math.random() - 0.5) * 0.2);
        posAttr.setZ(j, posAttr.getZ(j) + (Math.random() - 0.5) * 0.2);
      }
    }
    coneGeo.computeVertexNormals();

    const foliage = new THREE.Mesh(
      coneGeo, 
      Math.random() > 0.5 ? sharedMaterials.pineLeaves : sharedMaterials.leaves
    );
    foliage.position.y = currentY + layerHeight / 2;
    foliage.castShadow = true;
    
    // Slight tilt offset
    foliage.rotation.x = (Math.random() - 0.5) * 0.05;
    foliage.rotation.z = (Math.random() - 0.5) * 0.05;

    tree.add(foliage);

    currentY += layerHeight * 0.6;
    currentRadius *= 0.75;
  }

  tree.scale.set(heightScale, heightScale, heightScale);
  return tree;
}

// 7. Custom Stylized Boulders & Rocks
export function createStylizedRock(scale = 1.0, isDark = false): THREE.Mesh {
  const geo = new THREE.DodecahedronGeometry(1, 0); // wonderful low-poly faceted sphere
  
  // Stretch and compress vertices organically
  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setX(i, posAttr.getX(i) * (0.8 + Math.random() * 0.4));
    posAttr.setY(i, posAttr.getY(i) * (0.6 + Math.random() * 0.5));
    posAttr.setZ(i, posAttr.getZ(i) * (0.8 + Math.random() * 0.4));
  }
  geo.computeVertexNormals();

  const rock = new THREE.Mesh(geo, isDark ? sharedMaterials.darkStone : sharedMaterials.stone);
  rock.scale.set(scale, scale * 0.8, scale);
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

// 8. Interactive Crafted Furnace
export function createFurnaceModel(): THREE.Group {
  const furnace = new THREE.Group();
  
  // Base stacked stones
  const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 1.2, 6);
  const baseMesh = new THREE.Mesh(baseGeo, sharedMaterials.stone);
  baseMesh.position.y = 0.6;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  furnace.add(baseMesh);

  // Chimney cone
  const topGeo = new THREE.ConeGeometry(0.8, 0.8, 6);
  const topMesh = new THREE.Mesh(topGeo, sharedMaterials.darkStone);
  topMesh.position.y = 1.6;
  topMesh.castShadow = true;
  furnace.add(topMesh);

  // Inner glowing smelting aperture
  const apertureGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
  const aperture = new THREE.Mesh(apertureGeo, sharedMaterials.fireInner);
  aperture.position.set(0, 0.5, 0.7);
  furnace.add(aperture);

  return furnace;
}

// 9. Interactive Campfire
export function createCampfireModel(): THREE.Group {
  const group = new THREE.Group();

  // Logs crossed
  const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 4);
  
  const log1 = new THREE.Mesh(logGeo, sharedMaterials.wood);
  log1.position.y = 0.08;
  log1.rotation.set(Math.PI / 2, 0.3, 0);
  log1.castShadow = true;
  group.add(log1);

  const log2 = new THREE.Mesh(logGeo, sharedMaterials.wood);
  log2.position.y = 0.08;
  log2.rotation.set(Math.PI / 2, -0.3, Math.PI / 2);
  log2.castShadow = true;
  group.add(log2);

  // Glowing center flame cone
  const flameGeo = new THREE.ConeGeometry(0.3, 0.7, 5);
  const flame = new THREE.Mesh(flameGeo, sharedMaterials.fireInner);
  flame.position.set(0, 0.4, 0);
  flame.name = "CampfireFlame";
  group.add(flame);

  // Point light for gorgeous ambient warm glow at night
  const light = new THREE.PointLight(0xff7700, 2.0, 12);
  light.position.set(0, 0.8, 0);
  light.name = "CampfireLight";
  group.add(light);

  return group;
}

// 10. Dropped Item Collectibles
export function createMeatModel(cooked = false): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.2, 0.25, 0.15, 6);
  const meat = new THREE.Mesh(geo, cooked ? sharedMaterials.meatCooked : sharedMaterials.meatRaw);
  meat.rotation.x = Math.PI / 2;
  return meat;
}

export function createWoodLogModel(): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 5);
  const log = new THREE.Mesh(geo, sharedMaterials.wood);
  log.rotation.z = Math.PI / 2;
  return log;
}
