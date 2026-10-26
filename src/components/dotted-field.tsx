"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createEvenFigureMaterial, createFigureMaterial, disposeLoaded, readPointCloud } from "@/lib/point-cloud";
import { createRenderer } from "@/lib/webgl";

const MODEL_URL = "/models/people-points.glb";

// Two standing clusters in the glb, after the Y shift. The columns run from
// the feet up through the head. A cut above the feet left the legs at full
// brightness. The wider hill sheet sits just below these floors.
function isFigure(x: number, y: number, z: number) {
  const left = x > -0.62 && x < 0.22 && z > -0.8 && z < 0.08 && y > -0.62 && y < 1.08;
  const right = x > 0.26 && x < 1.08 && z > -0.18 && z < 0.66 && y > -0.42 && y < 1.42;
  if (left || right) return true;
  // Shoes continue into the hill sheet. Only the narrow column is a figure.
  const leftFoot = y > -0.84 && y <= -0.62 && (x + 0.34) ** 2 + (z + 0.44) ** 2 < 0.24 ** 2;
  const rightFoot = y > -0.62 && y <= -0.42 && (x - 0.64) ** 2 + (z - 0.3) ** 2 < 0.24 ** 2;
  // The boxes leave a slit where the hands meet. Those dots were still additive.
  const clasp = x >= 0.2 && x <= 0.28 && z > -0.24 && z < 0.26 && y > 0.7 && y < 1.02;
  return leftFoot || rightFoot || clasp;
}

function quietFigures(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const alpha = geometry.getAttribute("alpha");
  const seed = geometry.getAttribute("seed");
  if (
    !(position instanceof THREE.BufferAttribute) ||
    !(alpha instanceof THREE.BufferAttribute) ||
    !(seed instanceof THREE.BufferAttribute)
  ) {
    return geometry;
  }
  const coords: number[] = [];
  const alphas: number[] = [];
  const seeds: number[] = [];
  const bodies: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const body = isFigure(x, y, z);
    const speck = seed.getX(i);
    if (body && speck > 0.34) continue;
    coords.push(x, y, z);
    // Source alpha is much lower on the shorter figure, and normal blending
    // no longer stacks dots, so that person faded out. One tone for every
    // body point keeps both figures even from the shoes through the head.
    alphas.push(body ? 0.32 : alpha.getX(i));
    seeds.push(speck);
    bodies.push(body ? 1 : 0);
  }
  if (coords.length < 9) return geometry;
  const cloud = new THREE.BufferGeometry();
  cloud.setAttribute("position", new THREE.Float32BufferAttribute(coords, 3));
  cloud.setAttribute("alpha", new THREE.Float32BufferAttribute(alphas, 1));
  cloud.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
  cloud.setAttribute("body", new THREE.Float32BufferAttribute(bodies, 1));
  geometry.dispose();
  return cloud;
}

function takeCloud(geometry: THREE.BufferGeometry, figures: boolean) {
  const position = geometry.getAttribute("position");
  const alpha = geometry.getAttribute("alpha");
  const seed = geometry.getAttribute("seed");
  const body = geometry.getAttribute("body");
  const coords: number[] = [];
  const alphas: number[] = [];
  const seeds: number[] = [];
  const bodies: number[] = [];
  if (
    position instanceof THREE.BufferAttribute &&
    alpha instanceof THREE.BufferAttribute &&
    seed instanceof THREE.BufferAttribute &&
    body instanceof THREE.BufferAttribute
  ) {
    for (let i = 0; i < position.count; i += 1) {
      const isBody = body.getX(i) > 0.5;
      if (isBody !== figures) continue;
      coords.push(position.getX(i), position.getY(i), position.getZ(i));
      alphas.push(alpha.getX(i));
      seeds.push(seed.getX(i));
      bodies.push(isBody ? 1 : 0);
    }
  }
  const cloud = new THREE.BufferGeometry();
  cloud.setAttribute("position", new THREE.Float32BufferAttribute(coords, 3));
  cloud.setAttribute("alpha", new THREE.Float32BufferAttribute(alphas, 1));
  cloud.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
  cloud.setAttribute("body", new THREE.Float32BufferAttribute(bodies, 1));
  return cloud;
}
// The glb matches the HTML viewer cloud with Y one unit higher.
const PEOPLE_Y_SHIFT = -1;
// Centre of the two figures along X in the glb.
const FIGURE_CENTER_X = 0.3;

function mount(element: HTMLDivElement, renderer: THREE.WebGLRenderer, root: THREE.Object3D) {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reducedQuery.matches;
  const combined = quietFigures(readPointCloud(root, PEOPLE_Y_SHIFT));
  const floorGeometry = takeCloud(combined, false);
  const figureGeometry = takeCloud(combined, true);
  combined.dispose();
  disposeLoaded(root);

  renderer.setClearColor(0x0a0a0b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
  element.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const group = new THREE.Group();
  const floorMaterial = createFigureMaterial(0);
  const figureMaterial = createEvenFigureMaterial(reduced ? 0 : 1);
  const floor = new THREE.Points(floorGeometry, floorMaterial);
  const figures = new THREE.Points(figureGeometry, figureMaterial);
  floor.frustumCulled = false;
  figures.frustumCulled = false;
  floor.renderOrder = 0;
  figures.renderOrder = 1;
  // 0.25 is half the previous on-screen size; the camera distance stays fixed.
  // Drop the pair so both heads clear the top of the field on phone and desktop.
  group.scale.setScalar(0.25);
  group.position.y = 0.32;
  group.add(floor, figures);
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  let width = 1;
  let height = 1;
  let time = 0;

  const place = () => {
    const portrait = width < height;
    camera.fov = 35;
    camera.aspect = width / Math.max(height, 1);
    camera.position.set(0, 0.15, portrait ? 5.2 : 3.4);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // Only the hills stretch to the screen edges. The people keep their proportions,
    // and the floor shifts so the same patch of hill stays under their feet.
    const stretch = portrait ? 1.5 : Math.min(2.4, 1.2 + camera.aspect * 0.4);
    floor.scale.x = stretch;
    floor.position.x = -(stretch - 1) * FIGURE_CENTER_X;
    const sway = reduced ? 0 : Math.sin(time * 0.25) * 0.35;
    group.rotation.set(0.06, sway, 0);
  };

  const draw = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const motion = reduced ? 0 : 1;
    for (const material of [floorMaterial, figureMaterial]) {
      material.uniforms.uPR.value = ratio;
      material.uniforms.uTime.value = reduced ? 0 : time;
      material.uniforms.uMotion.value = motion;
    }
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    place();
    renderer.render(scene, camera);
  };

  const resize = () => {
    width = element.clientWidth;
    height = element.clientHeight;
    if (width < 2 || height < 2) return;
    draw();
  };

  let frame = 0;
  let visible = false;
  const started = performance.now();
  const loop = (now: number) => {
    time = (now - started) / 1000;
    if (visible && !reduced) draw();
    frame = visible && !reduced ? requestAnimationFrame(loop) : 0;
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !frame && !reduced) frame = requestAnimationFrame(loop);
    if (visible && reduced) draw();
  });
  const onReduce = () => {
    reduced = reducedQuery.matches;
    if (reduced) {
      cancelAnimationFrame(frame);
      frame = 0;
      time = 0;
      draw();
      return;
    }
    if (visible && !frame) frame = requestAnimationFrame(loop);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  observer.observe(element);
  reducedQuery.addEventListener("change", onReduce);
  resize();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver.disconnect();
    reducedQuery.removeEventListener("change", onReduce);
    floorGeometry.dispose();
    figureGeometry.dispose();
    floorMaterial.dispose();
    figureMaterial.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export function DottedField() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let teardown: (() => void) | undefined;
    let cancelled = false;
    const renderer = createRenderer(false, false);
    if (!renderer) return;
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (cancelled) {
          renderer.dispose();
          return;
        }
        teardown = mount(element, renderer, gltf.scene);
      },
      undefined,
      () => {
        if (!cancelled) renderer.dispose();
      },
    );

    return () => {
      cancelled = true;
      teardown?.();
      if (!teardown) renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden
      className="pointer-events-none relative z-0 h-[440px] w-full overflow-hidden sm:h-[min(56vw,70vh)] sm:min-h-[340px] [mask-image:linear-gradient(to_bottom,#000,#000_92%,transparent)]"
    />
  );
}
