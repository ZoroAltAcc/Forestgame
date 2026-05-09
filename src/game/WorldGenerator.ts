import * as THREE from 'three';
import { 
  createStylizedTree, 
  createStylizedRock, 
  createCampfireModel
} from './ProceduralModels';
import { createWaterMaterial } from './Shaders';

export interface WorldItem {
  id: string;
  type: 'tree' | 'rock' | 'campfire' | 'furnace' | 'crystal';
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
  private size = 120;
  private segments = 70;

  // Layered noise approximation for zero external dependencies
  private noise(x: number, z: number): number {
    const nx = x * 0.05;
    const nz = z * 0.05;
    
    // Large hills
    let e = Math.sin(nx) * Math.cos(nz) * 3.0;
    // Medium bumps
    e += Math.sin(nx * 2.5 + 1.0) * Math.cos(nz * 2.5 - 0.5) * 1.2;
    // Small faceted roughness
    e += Math.sin(nx * 8.0) * Math.cos(nz * 8.0) * 0.3;
    
    // Carve a gorgeous winding river valley right down the center
    const riverDist = Math.abs(x - Math.sin(z * 0.08) * 12.0);
    if (riverDist < 8.0) {
      // Dip down for river bed
      const depth = Math.max(0, 8.0 - riverDist) / 8.0;
      e -= depth * 3.5;
    }

    // High surrounding cliffs at extreme borders
    const borderDist = Math.max(Math.abs(x), Math.abs(z));
    if (borderDist > this.size * 0.35) {
      const cliffRise = (borderDist - this.size * 0.35) * 0.6;
      e += cliffRise;
    }

    return e;
  }

  public generate(): GroundData {
    const items: WorldItem[] = [];
    
    // 1. Terrain Geometry
    const terrainGeo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];
    const colorObj = new THREE.Color();

    // Cache computed heights for precise entity alignment
    const heightMap = new Map<string, number>();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      
      const vy = this.noise(vx, vz);
      posAttr.setY(i, vy);

      heightMap.set(`${Math.round(vx * 10)},${Math.round(vz * 10)}`, vy);

      // Procedural vertex coloring for exquisite stylized biome blending
      if (vy < -1.2) {
        // Wet sand/gravel riverbed
        colorObj.setHex(0x3e4f3c);
      } else if (vy > 6.0) {
        // High steep grey cliff rock
        colorObj.setHex(0x525b56);
      } else {
        // Lush vibrant or dark mossy forest green based on noise variation
        const greenMix = Math.sin(vx * 0.2) * Math.cos(vz * 0.2);
        colorObj.setHex(greenMix > 0 ? 0x274423 : 0x1d3a1a);
      }
      colors.push(colorObj.r, colorObj.g, colorObj.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    // Specular highlight allowed for gorgeous heavy rainfall wet reflections
    const terrainMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      flatShading: true,
      shininess: 15, // catches subtle moon/campfire specular gleams nicely
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;

    // Helper height locator
    const getHeightAt = (x: number, z: number): number => {
      // Clamp bounds
      if (Math.abs(x) > this.size / 2 || Math.abs(z) > this.size / 2) return 10;
      return this.noise(x, z);
    };

    // 2. Stylized Flowing River Water Plane
    const waterGeo = new THREE.PlaneGeometry(this.size, this.size, 40, 40);
    waterGeo.rotateX(-Math.PI / 2);
    // Align water slightly below normal terrain level so only the carved river valley reveals it!
    const waterMesh = new THREE.Mesh(waterGeo, createWaterMaterial());
    waterMesh.position.y = -1.1;
    waterMesh.receiveShadow = true;

    // 3. Spawn Stylized Procedural Forest Trees
    const numTrees = 160;
    for (let i = 0; i < numTrees; i++) {
      const tx = (Math.random() - 0.5) * (this.size * 0.8);
      const tz = (Math.random() - 0.5) * (this.size * 0.8);
      
      const ty = getHeightAt(tx, tz);
      
      // Avoid placing trees inside deep water or on steep high cliffs
      if (ty > -0.8 && ty < 5.5) {
        const scale = 0.7 + Math.random() * 0.8;
        const treeMesh = createStylizedTree(scale);
        treeMesh.position.set(tx, ty, tz);
        // Random rotational placement
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

    // 4. Spawn Faceted Rocks & Cliffs
    const numRocks = 90;
    for (let i = 0; i < numRocks; i++) {
      const rx = (Math.random() - 0.5) * (this.size * 0.85);
      const rz = (Math.random() - 0.5) * (this.size * 0.85);
      const ry = getHeightAt(rx, rz);

      // Boulders look fantastic near rivers and clustered on slopes
      if (ry > -1.5 && ry < 7.0) {
        const rockScale = 0.5 + Math.random() * 1.5;
        const isDark = ry > 4.0; // high cliff rocks are darker
        const rockMesh = createStylizedRock(rockScale, isDark);
        rockMesh.position.set(rx, ry + rockScale * 0.2, rz);
        rockMesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );

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

    // 5. Ambient Animated Grass Clumps (GPU friendly instances or merged group)
    const grassGroup = new THREE.Group();
    const grassGeo = new THREE.ConeGeometry(0.1, 0.6, 3);
    grassGeo.translate(0, 0.3, 0);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x3d6e35, flatShading: true });

    // Scatter low poly grass blades
    for (let i = 0; i < 300; i++) {
      const gx = (Math.random() - 0.5) * (this.size * 0.7);
      const gz = (Math.random() - 0.5) * (this.size * 0.7);
      const gy = getHeightAt(gx, gz);

      if (gy > -0.5 && gy < 4.0) {
        const blade = new THREE.Mesh(grassGeo, grassMat);
        blade.position.set(gx, gy, gz);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        blade.scale.setScalar(0.5 + Math.random() * 0.7);
        grassGroup.add(blade);
      }
    }

    // 6. Spawn one hidden ancient glowing crystal monolith for environmental storytelling!
    const cx = 25;
    const cz = -30;
    const cy = getHeightAt(cx, cz);
    const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: false });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(cx, cy + 1.5, cz);
    crystalMesh.scale.set(0.6, 2.5, 0.6);

    // Glowing base pedestal
    const pedGeo = new THREE.BoxGeometry(2, 0.5, 2);
    const pedMesh = new THREE.Mesh(pedGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }));
    pedMesh.position.set(cx, cy + 0.25, cz);
    grassGroup.add(pedMesh);

    // Light source
    const glowingLight = new THREE.PointLight(0x00f0ff, 3, 15);
    glowingLight.position.set(cx, cy + 2, cz);
    grassGroup.add(glowingLight);

    items.push({
      id: 'ancient_crystal',
      type: 'crystal',
      mesh: crystalMesh,
      position: new THREE.Vector3(cx, cy + 1.5, cz),
      health: 500,
      maxHealth: 500
    });

    // 7. Place an initial warm cozy abandoned campfire near player spawn point (0, 0)
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
