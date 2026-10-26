import * as THREE from "three";

const vertex = /* glsl */ `
  attribute float seed;
  attribute float alpha;
  uniform float uSize;
  uniform float uPR;
  uniform float uTime;
  uniform float uMotion;
  varying float vA;
  void main() {
    vec3 p = position;
    float wobble = uMotion * 0.003;
    p += wobble * vec3(
      sin(uTime * 0.7 + seed * 40.0),
      cos(uTime * 0.6 + seed * 33.0),
      sin(uTime * 0.5 + seed * 21.0)
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = max(0.05, -mv.z);
    gl_PointSize = max(1.0, uSize * uPR * (2.6 / depth) * (0.6 + seed * 0.8));
    vA = alpha * (0.55 + 0.45 * seed);
  }
`;

const fragment = /* glsl */ `
  uniform float uGain;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    gl_FragColor = vec4(vec3(1.0), vA * smoothstep(0.5, 0.15, d) * uGain);
  }
`;

function seedAt(index: number) {
  let state = Math.imul(index + 1, 0x6d2b79f5) >>> 0;
  state = Math.imul(state ^ (state >>> 15), state | 1) >>> 0;
  state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
}

const figureVertex = /* glsl */ `
  attribute float seed;
  attribute float alpha;
  attribute float body;
  uniform float uSize;
  uniform float uPR;
  uniform float uTime;
  uniform float uMotion;
  varying float vA;
  void main() {
    vec3 p = position;
    // Rise is 0 at the feet, so the body leans instead of sliding off the floor.
    // The offset stays a few percent of the figure so the silhouette still reads.
    float rise = clamp((position.y - 0.1) / 1.15, 0.0, 1.0);
    float gust = sin(uTime * 0.55);
    float flutter = sin(uTime * 0.85 + position.y * 1.4);
    float amp = body * uMotion * rise * 0.032;
    p.x += amp * (gust * 0.75 + flutter * 0.25);
    p.z += amp * sin(uTime * 0.37) * 0.22;
    float wobble = body * uMotion * 0.0035;
    p += wobble * vec3(
      sin(uTime * 0.7 + seed * 40.0),
      cos(uTime * 0.6 + seed * 33.0),
      sin(uTime * 0.5 + seed * 21.0)
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = max(0.05, -mv.z);
    gl_PointSize = max(1.0, uSize * uPR * (2.6 / depth) * (0.6 + seed * 0.8));
    vA = alpha * (0.55 + 0.45 * seed);
  }
`;

const evenFragment = /* glsl */ `
  uniform float uGain;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float cover = smoothstep(0.5, 0.15, d);
    // Tone matches one additive point on black. Coverage replaces, so stacked
    // hands stay at that tone instead of summing toward white.
    gl_FragColor = vec4(vec3(vA * uGain), cover);
  }
`;

export function createFigureMaterial(motion: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: 1.35 },
      uPR: { value: 1 },
      uTime: { value: 0 },
      uMotion: { value: motion },
      uGain: { value: 1 },
    },
    vertexShader: figureVertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createEvenFigureMaterial(motion: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: 1.35 },
      uPR: { value: 1 },
      uTime: { value: 0 },
      uMotion: { value: motion },
      uGain: { value: 1 },
    },
    vertexShader: figureVertex,
    fragmentShader: evenFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
}

export function createPointMaterial(motion: number, options?: { size?: number; gain?: number }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: options?.size ?? 1.6 },
      uPR: { value: 1 },
      uTime: { value: 0 },
      uMotion: { value: motion },
      uGain: { value: options?.gain ?? 1 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function readPointCloud(root: THREE.Object3D, yShift = 0) {
  let source: THREE.BufferGeometry | null = null;
  root.traverse((child) => {
    if (source || !(child instanceof THREE.Points)) return;
    const geometry = child.geometry;
    if (geometry.getAttribute("position")) source = geometry;
  });
  if (!source) throw new Error("point cloud missing");
  const geometry = source as THREE.BufferGeometry;
  const position = geometry.getAttribute("position");
  const color = geometry.getAttribute("color");
  if (!(position instanceof THREE.BufferAttribute)) throw new Error("point positions missing");
  const count = position.count;
  const coords = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const seed = new Float32Array(count);
  const colorAttr = color instanceof THREE.BufferAttribute ? color : null;
  for (let i = 0; i < count; i += 1) {
    coords[i * 3] = position.getX(i);
    coords[i * 3 + 1] = position.getY(i) + yShift;
    coords[i * 3 + 2] = position.getZ(i);
    const raw = colorAttr && colorAttr.itemSize >= 4 ? colorAttr.getW(i) : 1;
    alpha[i] = raw > 1 ? raw / 255 : raw;
    seed[i] = seedAt(i);
  }
  const cloud = new THREE.BufferGeometry();
  cloud.setAttribute("position", new THREE.BufferAttribute(coords, 3));
  cloud.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
  cloud.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  cloud.computeBoundingSphere();
  return cloud;
}

export function disposeLoaded(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Points)) return;
    child.geometry.dispose();
    const material = child.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material.dispose();
  });
}
