"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MascotScreen } from "@/components/mascot-screen";
import { getMascotBump, getMascotMood, setMascotHover, subscribeMascot, type MascotMood } from "@/lib/mascot-state";

const MODEL_URL = "/models/mascot.glb";
const MAX_DPR = 2;
const BASE_YAW = 0.58;

let gltfPromise: Promise<GLTF> | null = null;
const stillCache = new Map<string, string>();
const stillFlight = new Map<string, Promise<string | null>>();
let stillChain: Promise<unknown> = Promise.resolve();

function loadMascot() {
  if (!gltfPromise) {
    gltfPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_URL, resolve, undefined, (error) => {
        gltfPromise = null;
        reject(error);
      });
    });
  }
  return gltfPromise;
}

function makeRenderer(preserve: boolean) {
  const probe = document.createElement("canvas");
  const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!context) return null;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  try {
    return new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: preserve,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function moodForTarget(target: EventTarget | null): MascotMood | null {
  if (!(target instanceof Element)) return null;
  const menu = target.closest("header[data-header-solid], #site-menu, aside");
  const control = target.closest("a, button");
  if (menu && control && menu.contains(control)) return "wink";
  if (target.closest('a[href^="/works"], [data-home-frame]')) return "joy";
  const card = target.closest("article");
  if (card?.querySelector('a[href^="/works"]')) return "joy";
  if (card) return "surprised";
  if (control instanceof HTMLElement) {
    const box = control.getBoundingClientRect();
    if (box.width >= 180 && box.height >= 36) return "surprised";
  }
  return null;
}

let hoverUsers = 0;
let hoverHandler: ((event: Event) => void) | null = null;

function bindHover() {
  if (typeof document === "undefined") return () => {};
  hoverUsers += 1;
  if (!hoverHandler) {
    hoverHandler = (event: Event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMascotHover(null);
        return;
      }
      setMascotHover(moodForTarget(event.target));
    };
    document.addEventListener("pointerover", hoverHandler);
    document.addEventListener("pointermove", hoverHandler);
  }
  return () => {
    hoverUsers -= 1;
    if (hoverUsers === 0 && hoverHandler) {
      document.removeEventListener("pointerover", hoverHandler);
      document.removeEventListener("pointermove", hoverHandler);
      hoverHandler = null;
      setMascotHover(null);
    }
  };
}

function frameStage(camera: THREE.PerspectiveCamera, radius: number, aspect: number) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const safeAspect = Math.max(aspect, 0.35);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect);
  const dist = (radius * 1.24) / Math.tan(hFov / 2);
  camera.aspect = safeAspect;
  camera.position.set(0, radius * 0.02, dist);
  camera.near = Math.max(dist / 80, 0.01);
  camera.far = dist * 8;
  camera.lookAt(0, -radius * 0.38, 0);
  camera.updateProjectionMatrix();
}

function stage(renderer: THREE.WebGLRenderer, gltf: GLTF, screen: MascotScreen, loosen = 1, layout: "fit" | "stage" = "fit") {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 40);
  const model = gltf.scene.clone(true);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  model.updateMatrixWorld(true);
  const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, Math.max(size.x, size.y, size.z) * 0.5);
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  if (layout === "stage") {
    frameStage(camera, radius, 1);
  } else {
    camera.position.set(dist * 0.02, radius * 0.02, dist * 1.12 * loosen);
    camera.near = Math.max(dist / 80, 0.01);
    camera.far = dist * 8;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  let env: THREE.Texture | undefined;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 1.45;
    room.dispose();
    pmrem.dispose();
  } catch {
    env = undefined;
  }

  scene.add(new THREE.HemisphereLight(0xf5f7ff, 0x1c1e24, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(2.4, 3.6, 4.2);
  const rim = new THREE.DirectionalLight(0xd5e4ff, 2.4);
  rim.position.set(-3.4, 1.6, -1.8);
  const fill = new THREE.DirectionalLight(0xffffff, 0.85);
  fill.position.set(-0.2, 0.1, 3.6);
  scene.add(key, rim, fill);

  const tex = new THREE.CanvasTexture(screen.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const meshes: THREE.Mesh[] = [];
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name === "Screen") meshes.push(obj);
  });
  const face = meshes[0];
  if (face) {
    const current = Array.isArray(face.material) ? face.material[0] : face.material;
    if (current instanceof THREE.MeshStandardMaterial) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xffffff,
        toneMapped: false,
      });
      face.material = mat;
    }
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);

  const hopClip = gltf.animations.find((clip) => clip.name === "Hop") ?? null;
  return { scene, camera, pivot, model, env, tex, radius, screenMesh: face, hopClip, layout };
}

function release(renderer: THREE.WebGLRenderer, env?: THREE.Texture, tex?: THREE.Texture) {
  tex?.dispose();
  env?.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}

async function capture(mood: MascotMood, zoom = 1) {
  const renderer = makeRenderer(true);
  if (!renderer) return null;
  const screen = new MascotScreen();
  let env: THREE.Texture | undefined;
  let tex: THREE.Texture | undefined;
  try {
    await screen.ready;
    screen.paint(mood, 1, 0, true);
    const gltf = await loadMascot();
    const view = stage(renderer, gltf, screen);
    env = view.env;
    tex = view.tex;
    if (!view.screenMesh) return null;
    view.pivot.rotation.y = zoom > 1 ? BASE_YAW * 0.35 : BASE_YAW;
    if (zoom > 1) {
      view.camera.position.z /= zoom;
      view.camera.position.x *= 0.25;
      view.camera.lookAt(0, view.radius * 0.04, 0);
      view.camera.updateProjectionMatrix();
    }
    renderer.setPixelRatio(1);
    renderer.setSize(zoom > 1 ? 320 : 192, zoom > 1 ? 320 : 192, false);
    view.camera.aspect = 1;
    view.camera.updateProjectionMatrix();
    view.tex.needsUpdate = true;
    renderer.render(view.scene, view.camera);
    return renderer.domElement.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    release(renderer, env, tex);
  }
}

export function mascotStill(mood: MascotMood = "calm", zoom = 1) {
  const key = `${mood}:${zoom}`;
  const cached = stillCache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = stillFlight.get(key);
  if (pending) return pending;
  const job = stillChain.then(() => capture(mood, zoom));
  stillChain = job.then(
    () => undefined,
    () => undefined,
  );
  const done = job.then((url) => {
    stillFlight.delete(key);
    if (url) stillCache.set(key, url);
    return url;
  });
  stillFlight.set(key, done);
  return done;
}

export function MascotCanvas({
  onFail,
  loosen = 1,
  layout = "fit",
}: {
  onFail: () => void;
  loosen?: number;
  layout?: "fit" | "stage";
}) {
  const host = useRef<HTMLDivElement>(null);
  const onFailRef = useRef(onFail);
  const loosenRef = useRef(loosen);
  const layoutRef = useRef(layout);
  loosenRef.current = loosen;
  layoutRef.current = layout;

  useEffect(() => {
    onFailRef.current = onFail;
  });

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let stopped = false;
    let frame = 0;
    let env: THREE.Texture | undefined;
    let tex: THREE.Texture | undefined;
    let unobserve = () => {};
    let unsubscribe = () => {};
    const renderer = makeRenderer(false);
    if (!renderer) {
      onFailRef.current();
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const unbindHover = bindHover();
    const screen = new MascotScreen();
    const clock = new THREE.Clock();
    const look = { x: 0, y: 0 };
    const lookT = { x: 0, y: 0 };
    let lastMove = 0;
    let sleepy = false;
    let seenBump = getMascotBump();
    let mood: MascotMood = getMascotMood();

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth * 0.42);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight * 0.42);
      const limit = reduced ? 0.42 : 1;
      lookT.x = clamp(dx, -limit, limit);
      lookT.y = clamp(dy, -limit, limit);
      lastMove = clock.elapsedTime;
      sleepy = false;
    };

    const lost = (event: Event) => {
      event.preventDefault();
      if (!stopped) onFailRef.current();
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);

    screen.ready
      .then(() => loadMascot())
      .then((gltf) => {
        if (stopped) return;
        const view = stage(renderer, gltf, screen, loosenRef.current, layoutRef.current);
        env = view.env;
        tex = view.tex;
        if (!view.screenMesh) {
          onFailRef.current();
          return;
        }
        renderer.domElement.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
        renderer.domElement.setAttribute("aria-hidden", "true");
        element.replaceChildren(renderer.domElement);

        const mixer = new THREE.AnimationMixer(view.model);
        let hop: THREE.AnimationAction | null = null;
        const playHop = () => {
          if (reduced || !view.hopClip) return;
          if (!hop) {
            hop = mixer.clipAction(view.hopClip);
            hop.setLoop(THREE.LoopOnce, 1);
            hop.clampWhenFinished = false;
          }
          hop.reset().play();
        };

        unsubscribe = subscribeMascot(() => {
          mood = getMascotMood();
          const nextBump = getMascotBump();
          if (nextBump !== seenBump) {
            seenBump = nextBump;
            playHop();
          }
        });
        mood = getMascotMood();

        const fit = () => {
          const width = element.clientWidth;
          const height = element.clientHeight;
          if (width < 2 || height < 2) return;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
          renderer.setSize(width, height, false);
          if (view.layout === "stage") frameStage(view.camera, view.radius, width / height);
          else {
            view.camera.aspect = width / height;
            view.camera.updateProjectionMatrix();
          }
        };
        const observer = new ResizeObserver(fit);
        observer.observe(element);
        unobserve = () => observer.disconnect();

        const draw = (dt: number) => {
          const time = clock.elapsedTime;
          fit();
          if (!reduced && time - lastMove > 5) {
            const speed = sleepy ? 0.15 : 0.4;
            lookT.x = 0.55 * Math.sin(time * speed) + 0.15 * Math.sin(time * speed * 2.7);
            lookT.y = 0.25 * Math.sin(time * speed * 0.7) + (sleepy ? 0.35 : 0);
          }
          if (!reduced && mood === "calm" && time - lastMove > 14) sleepy = true;
          if (mood !== "calm") sleepy = false;
          const shown: MascotMood = sleepy && mood === "calm" ? "bored" : mood;
          const follow = Math.min(1, dt * 6);
          look.x += (lookT.x - look.x) * follow;
          look.y += (lookT.y - look.y) * follow;
          if (screen.paint(shown, time, dt, reduced)) view.tex.needsUpdate = true;
          if (hop?.isRunning()) mixer.update(dt);
          view.pivot.rotation.y = BASE_YAW + look.x * (reduced ? 0.26 : 0.74);
          view.pivot.rotation.x = look.y * (reduced ? 0.08 : 0.3);
          view.pivot.rotation.z = reduced ? 0 : Math.sin(time * 0.9) * 0.02;
          view.pivot.position.y = reduced ? 0 : Math.sin(time * 1.6) * view.radius * 0.04;
          view.pivot.position.x += (0 - view.pivot.position.x) * Math.min(1, dt * 8);
          renderer.render(view.scene, view.camera);
        };

        draw(0);
        window.addEventListener("pointermove", onMove);
        const tick = () => {
          if (stopped) return;
          frame = window.requestAnimationFrame(tick);
          draw(Math.min(clock.getDelta(), 0.05));
        };
        clock.getDelta();
        tick();
      })
      .catch(() => {
        if (!stopped) onFailRef.current();
      });

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      unobserve();
      unsubscribe();
      unbindHover();
      release(renderer, env, tex);
    };
  }, []);

  return <div ref={host} className="size-full" />;
}
