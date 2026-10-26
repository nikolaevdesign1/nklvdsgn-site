import * as THREE from "three";

export function createRenderer(alpha: boolean, antialias: boolean) {
  const probe = document.createElement("canvas");
  const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!context) return null;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  try {
    return new THREE.WebGLRenderer({ alpha, antialias });
  } catch {
    return null;
  }
}
