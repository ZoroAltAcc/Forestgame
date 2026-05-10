import * as THREE from 'three';
import { createStylizedTree, createStylizedRock, createCampfireModel, createFlowerModel, createCarrotModel, createWorkbenchModel } from './ProceduralModels';
import { createWaterMaterial } from './Shaders';

export interface WorldItem {
  id: string;
  type: 'tree' | 'rock' | 'campfire' | 'furnace' | 'crystal' | 'flower' | 'carrot' | 'workbench';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  isCustomPlaced?: boolean;
}

export interface GroundData {
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  items: WorldItem[];
  grassGroup: THREE.Group;
  worldSize: number;
  getHeightAt: (x: number, z: number) => number;
}

export class WorldGenerator {
  private size = 200; // Much bigger world
  private segments = 100;

  // Layered noise for terrain
  private noise(x: number, z: number): number {
    const nx = x * 0.04;
    const nz = z * 0.04;

    // Large rolling hills
    let e = Math.sin(nx * 0.8) * Math.cos(nz * 0.8) * 4.0;
    // Medium terrain variation
    e += Math.sin(nx * 2.0 + 0.5) * Math.cos(nz * 2.0 - 0.3) * 1.8;
    // Small bumps
    e += Math.sin(nx * 5.0) * Math.cos(nz * 5.0) * 0.5;
    // Micro detail
    e += Math.sin(nx * 12.0) * Math.cos(nz * 12.0) * 0.15;

    // Winding river valley
    const riverPath = Math.sin(z * 0.05) * 20.0 + Math.sin(z * 0.02) * 10.0;
    const riverDist = Math.abs(x - riverPath);
    if (riverDist < 12) {
      const riverDepth = (1 - riverDist / 12) * 3.5;
      e -= riverDepth;
    }
    
    // Secondary stream
    const stream2 = Math.cos(z * 0.08) * 15.0 + 30;
    const streamDist = Math.abs(x - stream2);
    if (streamDist < 6) {
      e -= (1 - streamDist / 6) * 2.0;
    }

    // Cliff walls at borders
    const borderDist = Math.max(Math.abs(x), Math.abs(z));
    if (borderDist > this.size * 0.4) {
      const cliffRise = (borderDist - this.size * 0.4) * 0.8;
      e += cliffRise;
    }

    return e;
  }

  public generate(): GroundData {
    const items: WorldItem[] = [];

    // ─── TERRAIN ───
    const terrainGeo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];
    const colorObj = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = this.noise(vx, vz);
      posAttr.setY(i, vy);

      // Vertex colors based on elevation
      if (vy < -1.5) {
        colorObj.setHex(0x5a4d3a); // River bed
      } else if (vy < -0.5) {
        colorObj.setHex(0x6b5d4a); // Sandy shore
      } else if (vy > 8.0) {
        colorObj.setHex(0x606666); // High cliff rock
      } else if (vy > 5.0) {
        colorObj.setHex(0x4a5550); // Rocky terrain
      } else {
        // Forest floor variation
        const variation = Math.sin(vx * 0.3) * Math.cos(vz * 0.3);
        if (variation > 0.3) {
          colorObj.setHex(0x2d5a28); // Bright grass patch
        } else if (variation < -0.3) {
          colorObj.setHex(0x1a3318); // Dark moss
        } else {
          colorObj.setHex(0x234420); // Normal grass
        }
      }

      colors.push(colorObj.r, colorObj.g, colorObj.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      flatShading: true,
      shininess: 10,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;

    const getHeightAt = (x: number, z: number): number => {
      if (Math.abs(x) > this.size / 2 || Math.abs(z) > this.size / 2) return 15;
      return this.noise(x, z);
    };

    // ─── WATER ───
    const waterGeo = new THREE.PlaneGeometry(this.size, this.size, 60, 60);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, createWaterMaterial());
    waterMesh.position.y = -1.3;

    // ─── TREES (Dense forest) ───
    const treeTypes: ('oak' | 'pine' | 'birch')[] = ['oak', 'pine', 'birch'];
    const numTrees = 350;
    for (let i = 0; i < numTrees; i++) {
      const tx = (Math.random() - 0.5) * this.size * 0.88;
      const tz = (Math.random() - 0.5) * this.size * 0.88;
      const ty = getHeightAt(tx, tz);

      if (ty > -0.3 && ty < 6.0) {
        const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        const treeScale = 0.6 + Math.random() * 0.8;
        const treeMesh = createStylizedTree(treeScale, treeType);
        treeMesh.position.set(tx, ty, tz);
        treeMesh.rotation.y = Math.random() * Math.PI * 2;

        items.push({
          id: `tree_${i}`,
          type: 'tree',
          mesh: treeMesh,
          position: new THREE.Vector3(tx, ty, tz),
          health: 100,
          maxHealth: 100
        });
      }
    }

    // ─── ROCKS ───
    const numRocks = 150;
    for (let i = 0; i < numRocks; i++) {
      const rx = (Math.random() - 0.5) * this.size * 0.85;
      const rz = (Math.random() - 0.5) * this.size * 0.85;
      const ry = getHeightAt(rx, rz);

      if (ry > -1.0 && ry < 10.0) {
        const rockScale = 0.3 + Math.random() * 1.0;
        const isDark = ry > 4.0;
        const rockMesh = createStylizedRock(rockScale, isDark);
        rockMesh.position.set(rx, ry + rockScale * 0.3, rz);
        rockMesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);

        items.push({
          id: `rock_${i}`,
          type: 'rock',
          mesh: rockMesh,
          position: new THREE.Vector3(rx, ry, rz),
          health: 80,
          maxHealth: 80
        });
      }
    }

    // ─── FLOWERS ───
    const flowerColors: ('pink' | 'yellow' | 'white' | 'blue')[] = ['pink', 'yellow', 'white', 'blue'];
    const numFlowers = 200;
    for (let i = 0; i < numFlowers; i++) {
      const fx = (Math.random() - 0.5) * this.size * 0.8;
      const fz = (Math.random() - 0.5) * this.size * 0.8;
      const fy = getHeightAt(fx, fz);

      if (fy > 0 && fy < 3.5) {
        const colorType = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const flowerMesh = createFlowerModel(colorType);
        flowerMesh.position.set(fx, fy, fz);
        flowerMesh.rotation.y = Math.random() * Math.PI * 2;
        flowerMesh.scale.setScalar(0.8 + Math.random() * 0.4);

        items.push({
          id: `flower_${i}`,
          type: 'flower',
          mesh: flowerMesh,
          position: new THREE.Vector3(fx, fy, fz),
          health: 10,
          maxHealth: 10
        });
      }
    }

    // ─── CARROTS ───
    const numCarrots = 60;
    for (let i = 0; i < numCarrots; i++) {
      const cx = (Math.random() - 0.5) * this.size * 0.7;
      const cz = (Math.random() - 0.5) * this.size * 0.7;
      const cy = getHeightAt(cx, cz);

      if (cy > 0.5 && cy < 3.0) {
        const carrotMesh = createCarrotModel();
        carrotMesh.position.set(cx, cy, cz);
        carrotMesh.rotation.y = Math.random() * Math.PI * 2;

        items.push({
          id: `carrot_${i}`,
          type: 'carrot',
          mesh: carrotMesh,
          position: new THREE.Vector3(cx, cy, cz),
          health: 5,
          maxHealth: 5
        });
      }
    }

    // ─── GRASS ───
    const grassGroup = new THREE.Group();
    const grassGeo = new THREE.ConeGeometry(0.08, 0.5, 3);
    grassGeo.translate(0, 0.25, 0);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x3d7a35, flatShading: true });
    const darkGrassMat = new THREE.MeshLambertMaterial({ color: 0x2d5a28, flatShading: true });

    for (let i = 0; i < 1500; i++) {
      const gx = (Math.random() - 0.5) * this.size * 0.92;
      const gz = (Math.random() - 0.5) * this.size * 0.92;
      const gy = getHeightAt(gx, gz);

      if (gy > -0.3 && gy < 4.5) {
        const blade = new THREE.Mesh(grassGeo, Math.random() > 0.5 ? grassMat : darkGrassMat);
        blade.position.set(gx, gy, gz);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        blade.scale.setScalar(0.4 + Math.random() * 0.8);
        grassGroup.add(blade);
      }
    }

    // ─── ANCIENT CRYSTAL ───
    const cx = 35;
    const cz = -45;
    const cy = getHeightAt(cx, cz);

    const crystalGeo = new THREE.OctahedronGeometry(1.5, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(cx, cy + 2, cz);
    crystalMesh.scale.set(0.6, 3.0, 0.6);

    const pedGeo = new THREE.BoxGeometry(2.5, 0.6, 2.5);
    const pedMesh = new THREE.Mesh(pedGeo, new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true }));
    pedMesh.position.set(cx, cy + 0.3, cz);
    grassGroup.add(pedMesh);

    const glowingLight = new THREE.PointLight(0x00f0ff, 4, 20);
    glowingLight.position.set(cx, cy + 3, cz);
    grassGroup.add(glowingLight);

    items.push({
      id: 'ancient_crystal',
      type: 'crystal',
      mesh: crystalMesh,
      position: new THREE.Vector3(cx, cy + 2, cz),
      health: 500,
      maxHealth: 500
    });

    // ─── STARTING CAMPFIRE ───
    const initCampY = getHeightAt(3, 3);
    const initialCampfire = createCampfireModel();
    initialCampfire.position.set(3, initCampY, 3);

    items.push({
      id: 'init_campfire',
      type: 'campfire',
      mesh: initialCampfire,
      position: new THREE.Vector3(3, initCampY, 3),
      health: 100,
      maxHealth: 100,
      isCustomPlaced: true
    });

    // ─── STARTING WORKBENCH ───
    const wbY = getHeightAt(-4, 2);
    const workbench = createWorkbenchModel();
    workbench.position.set(-4, wbY, 2);
    workbench.rotation.y = Math.PI * 0.25;

    items.push({
      id: 'init_workbench',
      type: 'workbench',
      mesh: workbench,
      position: new THREE.Vector3(-4, wbY, 2),
      health: 200,
      maxHealth: 200,
      isCustomPlaced: true
    });

    return {
      terrainMesh,
      waterMesh,
      items,
      grassGroup,
      worldSize: this.size,
      getHeightAt
    };
  }
}
