"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createPointMaterial, disposeLoaded, readPointCloud } from "@/lib/point-cloud";
import { createRenderer } from "@/lib/webgl";

const MODEL_URL = "/models/hands-points.glb";
const REST_X = 0.08;
const REST_Y = 0.4;
const FILL = 0.62;
const POINT_STRIDE = 3;

function thinCloud(geometry: THREE.BufferGeometry) {
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
  let eligible = 0;
  for (let i = 0; i < position.count; i += 1) {
    const value = alpha.getX(i);
    if (value < 0.78) continue;
    eligible += 1;
    if (eligible % POINT_STRIDE !== 0) continue;
    coords.push(position.getX(i), position.getY(i), position.getZ(i));
    alphas.push(value * 0.45);
    seeds.push(seed.getX(i));
  }
  if (coords.length < 9) return geometry;
  const cloud = new THREE.BufferGeometry();
  cloud.setAttribute("position", new THREE.Float32BufferAttribute(coords, 3));
  cloud.setAttribute("alpha", new THREE.Float32BufferAttribute(alphas, 1));
  cloud.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
  geometry.dispose();
  return cloud;
}

function frameHands(
  camera: THREE.PerspectiveCamera,
  group: THREE.Group,
  dense: Float32Array,
  aspect: number,
) {
  const fov = 35;
  let dist = 2.6;
  let shiftX = 0;
  let shiftY = 0;
  const count = dense.length / 3;
  const world = new THREE.Vector3();
  const view = new THREE.Vector3();
  camera.fov = fov;
  camera.near = 0.01;
  camera.far = 80;
  if (count < 2) {
    camera.aspect = aspect;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    group.position.set(0, 0, 0);
    group.rotation.set(REST_X, REST_Y, 0);
    return { dist, shiftX, shiftY };
  }
  for (let iter = 0; iter < 8; iter += 1) {
    camera.aspect = aspect;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    group.position.set(shiftX, shiftY, 0);
    group.rotation.set(REST_X, REST_Y, 0);
    group.updateMatrixWorld(true);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < count; i += 1) {
      world.set(dense[i * 3], dense[i * 3 + 1], dense[i * 3 + 2]).applyMatrix4(group.matrixWorld);
      view.copy(world).applyMatrix4(camera.matrixWorldInverse);
      if (view.z > -0.02) continue;
      world.project(camera);
      if (world.x < minX) minX = world.x;
      if (world.x > maxX) maxX = world.x;
      if (world.y < minY) minY = world.y;
      if (world.y > maxY) maxY = world.y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) break;
    const midX = (minX + maxX) * 0.5;
    const midY = (minY + maxY) * 0.5;
    const halfX = (maxX - minX) * 0.5;
    const halfY = (maxY - minY) * 0.5;
    const tan = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const reach = Math.max(dist, 0.2);
    shiftX -= midX * reach * tan * aspect;
    shiftY -= midY * reach * tan;
    const span = Math.max(halfX, halfY);
    if (span > 0.001) dist *= span / FILL;
    dist = THREE.MathUtils.clamp(dist, 0.45, 40);
  }
  return { dist, shiftX, shiftY };
}

function mount(element: HTMLDivElement, renderer: THREE.WebGLRenderer, root: THREE.Object3D) {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reducedQuery.matches;
  const geometry = thinCloud(readPointCloud(root, 0));
  const dense = geometry.getAttribute("position").array as Float32Array;
  disposeLoaded(root);

  renderer.setClearColor(0x0a0a0b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  element.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const group = new THREE.Group();
  const material = createPointMaterial(reduced ? 0 : 1, { size: 1.25, gain: 0.55 });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  group.add(points);
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  let width = 1;
  let height = 1;
  let dist = 2.6;
  let shiftX = 0;
  let shiftY = 0;

  const place = () => {
    group.position.set(shiftX, shiftY, 0);
    group.rotation.set(REST_X, REST_Y, 0);
    camera.aspect = width / Math.max(height, 1);
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };

  const draw = (time: number) => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    material.uniforms.uPR.value = ratio;
    material.uniforms.uTime.value = reduced ? 0 : time;
    material.uniforms.uMotion.value = reduced ? 0 : 1;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    place();
    renderer.render(scene, camera);
  };

  const resize = () => {
    width = element.clientWidth;
    height = element.clientHeight;
    if (width < 2 || height < 2) return;
    const fitted = frameHands(camera, group, dense, width / height);
    dist = fitted.dist;
    shiftX = fitted.shiftX;
    shiftY = fitted.shiftY;
    draw(0);
  };

  let frame = 0;
  const started = performance.now();
  const loop = (now: number) => {
    draw((now - started) / 1000);
    frame = requestAnimationFrame(loop);
  };
  const onReduce = () => {
    reduced = reducedQuery.matches;
    if (reduced) {
      cancelAnimationFrame(frame);
      frame = 0;
      draw(0);
      return;
    }
    if (!frame) frame = requestAnimationFrame(loop);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  reducedQuery.addEventListener("change", onReduce);
  resize();
  if (!reduced) frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    reducedQuery.removeEventListener("change", onReduce);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export function HandsScene() {
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
        try {
          teardown = mount(element, renderer, gltf.scene);
        } catch {
          renderer.dispose();
        }
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

  return <div ref={host} aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-background" />;
}
