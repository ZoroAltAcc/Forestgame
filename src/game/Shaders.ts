import * as THREE from 'three';

// Stylized Flowing River Water with foam lines and procedural rain ripples
export const WaterShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uRainIntensity;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Gentle flowing waves
      float wave = sin(pos.x * 2.0 + uTime * 3.0) * cos(pos.y * 2.0 + uTime * 2.0) * 0.1;
      
      // Rain splash disturbance
      float ripple = sin(pos.x * 15.0 - uTime * 10.0) * cos(pos.y * 15.0 - uTime * 10.0) * (0.05 * uRainIntensity);
      
      pos.z += wave + ripple;
      
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPosition.xyz;
      
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorCrest;
    uniform float uRainIntensity;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Flow distortion
      vec2 flowUv = vUv * 8.0;
      flowUv.x += uTime * 0.5;
      
      float noise = fract(sin(dot(flowUv, vec2(12.9898, 78.233))) * 43758.5453);
      
      // Stylized horizontal foam lines
      float crest = sin(vWorldPos.x * 4.0 + uTime * 4.0) * sin(vWorldPos.z * 4.0 + uTime * 4.0);
      crest = smoothstep(0.7, 0.9, crest);
      
      // Rain ripple circles
      vec2 gridUv = fract(vWorldPos.xz * 3.0) - 0.5;
      float dist = length(gridUv);
      float rippleRing = sin(dist * 30.0 - uTime * 15.0);
      float rippleMask = smoothstep(0.4, 0.5, dist) * smoothstep(0.5, 0.45, dist) * uRainIntensity;
      
      vec3 finalColor = mix(uColorBase, uColorCrest, crest + (rippleRing > 0.8 ? rippleMask : 0.0));
      
      // Water edge foam blend approximation
      gl_FragColor = vec4(finalColor, 0.85);
    }
  `
};

export function createWaterMaterial(colorBase = 0x1d555b, colorCrest = 0x68b7b2): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRainIntensity: { value: 0.5 },
      uColorBase: { value: new THREE.Color(colorBase) },
      uColorCrest: { value: new THREE.Color(colorCrest) }
    },
    vertexShader: WaterShader.vertexShader,
    fragmentShader: WaterShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });
}
