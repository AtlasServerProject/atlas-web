import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { compileChannel, WalkAnimation } from './bedrock-animation';

type V3 = [number, number, number];
interface Cube {
  origin: V3;
  size: V3;
  uv: [number, number];
  inflate?: number;
  pivot?: V3;
  rotation?: V3;
  mirror?: boolean;
}
interface Bone {
  name: string;
  parent?: string;
  pivot?: V3;
  rotation?: V3;
  mirror?: boolean;
  cubes?: Cube[];
}
interface Asset {
  model: {
    'minecraft:geometry': {
      description: { texture_width: number; texture_height: number };
      bones: Bone[];
    }[];
  };
  animations: WalkAnimation[];
  procedural: { kind: string; speed: number; amplitude: number; left: string; right: string }[];
  presentationMotion?: { kind: string; amplitude: number } | null;
  transforms: { part: string; isVisible?: boolean; rotation?: V3; position?: V3; scale?: V3 }[];
  normal: string;
  shiny: string;
  layers: Record<
    'normal' | 'shiny',
    { texture: string; emissive: boolean; translucent: boolean }[]
  >;
}
export interface PokemonView {
  render(time: number): void;
  dispose(): void;
  rotate(delta: number): void;
  zoom(delta: number): void;
  reset(): void;
}

/** One shared WebGL context; each visible card receives a 2D canvas copy.
 * No per-species WebGL contexts and no code evaluation from Molang assets.
 */
let renderer: THREE.WebGLRenderer | undefined;
const views = new Set<PokemonView>();
let frame = 0,
  previous = 0,
  elapsed = 0,
  lastDraw = 0;
let paused = false;
const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now: number) {
  frame = 0;
  if (!views.size || document.hidden) {
    previous = 0;
    return;
  }
  if (now - lastDraw >= 1000 / 30) {
    elapsed += previous ? Math.min((now - previous) / 1000, 0.1) : 0;
    previous = now;
    lastDraw = now;
    views.forEach((view) => view.render(elapsed));
  }
  if (!motion() && !paused) frame = requestAnimationFrame(tick);
}
export function setKeyAnimationsPaused(value: boolean) {
  paused = value;
  previous = 0;
  cancelAnimationFrame(frame);
  frame = 0;
  schedule();
}
function schedule() {
  if (!frame && views.size && !document.hidden) frame = requestAnimationFrame(tick);
}
function sharedRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    document.addEventListener('visibilitychange', schedule);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', schedule);
  }
  return renderer;
}
export function releaseKeyRenderer() {
  if (views.size) return;
  cancelAnimationFrame(frame);
  frame = 0;
  previous = 0;
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer = undefined;
  paused = false;
  document.removeEventListener('visibilitychange', schedule);
  matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', schedule);
}
function safeLocalUrl(path: string, base = location.href) {
  const url = new URL(path, base);
  if (
    url.origin !== location.origin ||
    !/^\/pokemon\/keys\/[a-z0-9]+\/(model\.json|(?:normal|shiny)(?:-layer-\d+)?\.png)$/.test(
      url.pathname,
    )
  )
    throw new Error('Invalid model path');
  return url.href;
}
async function loadTexture(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Texture unavailable');
  const blobUrl = URL.createObjectURL(await response.blob());
  let texture: THREE.Texture;
  try {
    texture = await new THREE.TextureLoader().loadAsync(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
  if (signal.aborted) {
    texture.dispose();
    throw new DOMException('Aborted', 'AbortError');
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export async function mountKeyPokemon(
  canvas: HTMLCanvasElement,
  url: string,
  signal: AbortSignal,
): Promise<PokemonView> {
  const modelUrl = safeLocalUrl(url);
  const response = await fetch(modelUrl, { signal });
  if (!response.ok) throw new Error('Model unavailable');
  const asset = (await response.json()) as Asset;
  const textures: THREE.Texture[] = [],
    geometries: THREE.BufferGeometry[] = [],
    materials: THREE.Material[] = [];
  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };
  try {
    // Wait for both settlements so a failed texture cannot orphan the other bitmap.
    const layerSpecs = [asset.layers.normal, asset.layers.shiny];
    const paths = [asset.normal, asset.shiny, ...layerSpecs.flat().map((layer) => layer.texture)];
    const loaded = await Promise.allSettled(
      paths.map((path) => loadTexture(safeLocalUrl(path, modelUrl), signal)),
    );
    for (const result of loaded) if (result.status === 'fulfilled') textures.push(result.value);
    if (loaded.some((result) => result.status === 'rejected') || signal.aborted)
      throw new Error('Textures unavailable');
    const baseMaterials = textures
      .slice(0, 2)
      .map(
        (texture) =>
          new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.1, side: THREE.DoubleSide }),
      );
    materials.push(...baseMaterials);
    let textureIndex = 2;
    const layerMaterials = layerSpecs.map((layers) =>
      layers.map((layer) => {
        const options = {
          map: textures[textureIndex++],
          alphaTest: 0.025,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        };
        const material = layer.emissive
          ? new THREE.MeshBasicMaterial(options)
          : new THREE.MeshLambertMaterial(options);
        materials.push(material);
        return material;
      }),
    );
    const data = asset.model['minecraft:geometry'][0];
    const root = new THREE.Group(),
      presentation = new THREE.Group(),
      spin = new THREE.Group();
    presentation.add(root);
    spin.add(presentation);
    const groups = new Map<string, THREE.Group>();
    const convertPoint = (p: V3): V3 => [-p[0], p[1], p[2]];
    const pivots = new Map(data.bones.map((b) => [b.name, convertPoint(b.pivot ?? [0, 0, 0])]));
    const meshes: { base: THREE.Mesh; overlays: THREE.Mesh[] }[] = [];
    // Bedrock -> Three coordinates: reflect X and negate X/Y Euler angles.
    const rotate = (object: THREE.Object3D, rotation?: V3) => {
      object.rotation.order = 'ZYX';
      if (rotation)
        object.rotation.set(
          (-rotation[0] * Math.PI) / 180,
          (-rotation[1] * Math.PI) / 180,
          (rotation[2] * Math.PI) / 180,
        );
    };
    for (const bone of data.bones) groups.set(bone.name, new THREE.Group());
    for (const bone of data.bones) {
      const group = groups.get(bone.name)!,
        pivot = pivots.get(bone.name)!;
      const parentPivot = bone.parent ? pivots.get(bone.parent)! : [0, 0, 0];
      group.position.set(
        pivot[0] - parentPivot[0],
        pivot[1] - parentPivot[1],
        pivot[2] - parentPivot[2],
      );
      rotate(group, bone.rotation);
      (bone.parent ? groups.get(bone.parent)! : root).add(group);
      const cubes: THREE.BufferGeometry[] = [];
      for (const cube of bone.cubes ?? []) {
        const [x, y, z] = cube.size,
          inflate = cube.inflate ?? 0,
          [u, v] = cube.uv;
        const geometry = new THREE.BoxGeometry(
          Math.max(x + 2 * inflate, 0.001),
          Math.max(y + 2 * inflate, 0.001),
          Math.max(z + 2 * inflate, 0.001),
        );
        const rects = [
          [u, v + z, z, y],
          [u + z + x, v + z, z, y],
          [u + z + x, v + z, -x, -z],
          [u + z + 2 * x, v, -x, z],
          [u + 2 * z + x, v + z, x, y],
          [u + z, v + z, x, y],
        ];
        if (cube.mirror ?? bone.mirror) {
          rects.forEach((r) => {
            r[0] += r[2];
            r[2] *= -1;
          });
          [rects[0], rects[1]] = [rects[1], rects[0]];
        }
        const uv = geometry.getAttribute('uv');
        rects.forEach(([left, top, width, height], face) => {
          for (let vertex = 0; vertex < 4; vertex++) {
            const index = face * 4 + vertex;
            const s = uv.getX(index),
              t = uv.getY(index);
            const insetX = Math.sign(width) * Math.min(1 / 64, Math.abs(width) / 2),
              insetY = Math.sign(height) * Math.min(1 / 64, Math.abs(height) / 2);
            uv.setXY(
              index,
              (left + insetX + s * (width - insetX * 2)) / data.description.texture_width,
              1 -
                (top + insetY + (1 - t) * (height - insetY * 2)) / data.description.texture_height,
            );
          }
        });
        const cubePivot = cube.pivot ? convertPoint(cube.pivot) : pivot;
        const wrapper = new THREE.Object3D();
        wrapper.position.set(
          cubePivot[0] - pivot[0],
          cubePivot[1] - pivot[1],
          cubePivot[2] - pivot[2],
        );
        rotate(wrapper, cube.rotation);
        wrapper.updateMatrix();
        geometry.translate(
          -cube.origin[0] - x / 2 - cubePivot[0],
          cube.origin[1] + y / 2 - cubePivot[1],
          cube.origin[2] + z / 2 - cubePivot[2],
        );
        geometry.applyMatrix4(wrapper.matrix);
        cubes.push(geometry);
      }
      if (cubes.length) {
        const merged = mergeGeometries(cubes);
        cubes.forEach((g) => g.dispose());
        if (!merged) throw new Error('Invalid geometry');
        geometries.push(merged);
        const mesh = new THREE.Mesh(merged, baseMaterials[0]);
        group.add(mesh);
        const overlays = Array.from(
          { length: Math.max(...layerMaterials.map((m) => m.length)) },
          (_, i) => {
            const overlay = new THREE.Mesh(merged, layerMaterials[0][i] ?? layerMaterials[1][i]);
            overlay.renderOrder = i + 1;
            group.add(overlay);
            return overlay;
          },
        );
        meshes.push({ base: mesh, overlays });
      }
    }
    for (const part of asset.transforms) {
      const group = groups.get(part.part);
      if (!group) continue;
      if (part.isVisible !== undefined) group.visible = part.isVisible;
      if (part.rotation) rotate(group, part.rotation);
      if (part.position) group.position.add(new THREE.Vector3(...convertPoint(part.position)));
      if (part.scale) group.scale.set(...part.scale);
    }
    const rest = [...groups.values()].map((group) => ({
      group,
      position: group.position.clone(),
      rotation: group.rotation.clone(),
      scale: group.scale.clone(),
    }));
    const animations = asset.animations.map((animation) => ({
      length: animation.animation_length,
      tracks: Object.entries(animation.bones).flatMap(([bone, channels]) => {
        const group = groups.get(bone);
        if (!group) return [];
        // Two Marshadow Z-axis expressions are malformed in the original add-on.
        // Hold only those axes at rest; preserve every other original channel.
        return [
          {
            group,
            position:
              channels.position === undefined ? null : compileChannel(channels.position, () => 0),
            rotation:
              channels.rotation === undefined ? null : compileChannel(channels.rotation, () => 0),
            scale: channels.scale === undefined ? null : compileChannel(channels.scale, () => 1),
          },
        ];
      }),
    }));
    const pose = (time: number) => {
      rest.forEach((r) => {
        r.group.position.copy(r.position);
        r.group.rotation.copy(r.rotation);
        r.group.scale.copy(r.scale);
      });
      for (const animation of animations) {
        const t = animation.length ? time % animation.length : time;
        for (const track of animation.tracks) {
          if (track.position) {
            const p = track.position(t);
            track.group.position.x -= p[0];
            track.group.position.y += p[1];
            track.group.position.z += p[2];
          }
          if (track.rotation) {
            const r = track.rotation(t);
            track.group.rotation.x -= (r[0] * Math.PI) / 180;
            track.group.rotation.y -= (r[1] * Math.PI) / 180;
            track.group.rotation.z += (r[2] * Math.PI) / 180;
          }
          if (track.scale) {
            const s = track.scale(t);
            track.group.scale.x *= s[0];
            track.group.scale.y *= s[1];
            track.group.scale.z *= s[2];
          }
        }
      }
      for (const walk of asset.procedural) {
        if (walk.kind === 'wing_flap') {
          const angle = Math.sin(time * Math.PI * 2 * walk.speed) * walk.amplitude;
          const left = groups.get(walk.left), right = groups.get(walk.right);
          if (left) left.rotation.z += angle;
          if (right) right.rotation.z -= angle;
          continue;
        }
        // Cobblemon's standard gait: cosine in radians, opposite phase per limb.
        const angle = Math.cos(time * 20 * walk.speed * 0.6662) * 1.4 * walk.amplitude;
        const left = groups.get(walk.left),
          right = groups.get(walk.right);
        if (left) left.rotation.x -= angle;
        if (right) right.rotation.x += angle;
      }
    };
    const bounds = new THREE.Box3();
    for (let i = 0; i < 12; i++) {
      pose(i / 3);
      root.updateMatrixWorld(true);
      root.traverseVisible((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.computeBoundingBox();
          bounds.union(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld));
        }
      });
    }
    const size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.length()) || !size.length()) throw new Error('Empty model');
    presentation.position.copy(center).negate();
    const scene = new THREE.Scene();
    scene.add(spin, new THREE.HemisphereLight(0xffffff, 0x6f83a3, 2.1));
    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.position.set(-2, 4, -5);
    scene.add(light);
    const camera = new THREE.OrthographicCamera();
    const radius = size.length() * 0.5;
    const distance = Math.max(radius * 4, 10);
    camera.position.set(distance * 0.55, distance * 0.3, -distance);
    camera.near = 0.1;
    camera.far = distance * 5;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const screenRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const screenUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const corners = [-1, 1].flatMap((x) =>
      [-1, 1].flatMap((y) =>
        [-1, 1].map((z) => new THREE.Vector3((x * size.x) / 2, (y * size.y) / 2, (z * size.z) / 2)),
      ),
    );
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas unavailable');
    let rotation = 0,
      zoom = 1;
    let resizeObserver: ResizeObserver | undefined;
    const gpu = sharedRenderer();
    const view: PokemonView = {
      render(time) {
        if (disposed) return;
        const ratio = Math.min(devicePixelRatio || 1, 1.5),
          width = Math.round(canvas.clientWidth * ratio),
          height = Math.round(canvas.clientHeight * ratio);
        if (!width || !height) return;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        if (gpu.domElement.width !== width || gpu.domElement.height !== height)
          gpu.setSize(width, height, false);
        pose(motion() ? 0 : time);
        spin.rotation.y = rotation;
        const displayTime = motion() ? 0 : time;
        spin.position.y = asset.presentationMotion?.kind === 'float'
          ? Math.sin(displayTime * 1.8) * size.y * asset.presentationMotion.amplitude : 0;
        spin.scale.y = asset.presentationMotion?.kind === 'breathe'
          ? 1 + Math.sin(displayTime * 2) * asset.presentationMotion.amplitude : 1;
        const half = Math.floor(width / 2),
          aspect = half / height;
        // Fit the projected bounds, including all sampled poses; recalculate on rotation.
        const projected = corners.map((corner) =>
          corner.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, rotation),
        );
        const xs = projected.map((c) => c.dot(screenRight)),
          ys = projected.map((c) => c.dot(screenUp));
        const span =
          Math.max(
            Math.max(...ys) - Math.min(...ys),
            (Math.max(...xs) - Math.min(...xs)) / aspect,
          ) * 1.12;
        camera.left = (-span * aspect) / 2;
        camera.right = (span * aspect) / 2;
        camera.top = span / 2;
        camera.bottom = -span / 2;
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        gpu.setScissorTest(false);
        gpu.setViewport(0, 0, width, height);
        gpu.clear();
        gpu.setScissorTest(true);
        for (let variant = 0; variant < 2; variant++) {
          meshes.forEach((mesh) => {
            mesh.base.material = baseMaterials[variant];
            mesh.overlays.forEach((overlay, i) => {
              overlay.visible = !!layerMaterials[variant][i];
              if (overlay.visible) overlay.material = layerMaterials[variant][i];
            });
          });
          const x = variant * half,
            w = variant ? width - half : half;
          gpu.setViewport(x, 0, w, height);
          gpu.setScissor(x, 0, w, height);
          gpu.render(scene, camera);
        }
        context.clearRect(0, 0, width, height);
        context.drawImage(gpu.domElement, 0, 0);
        canvas.dataset['rendered'] = 'true';
      },
      rotate(delta) {
        rotation += delta;
        view.render(elapsed);
      },
      zoom(delta) {
        zoom = THREE.MathUtils.clamp(zoom + delta, 0.8, 1.8);
        view.render(elapsed);
      },
      reset() {
        rotation = 0;
        zoom = 1;
        view.render(elapsed);
      },
      dispose() {
        resizeObserver?.disconnect();
        views.delete(view);
        cleanup();
        if (!views.size) {
          cancelAnimationFrame(frame);
          frame = 0;
          previous = 0;
        }
      },
    };
    if (signal.aborted) {
      view.dispose();
      throw new DOMException('Aborted', 'AbortError');
    }
    resizeObserver = new ResizeObserver(() => view.render(elapsed));
    resizeObserver.observe(canvas);
    views.add(view);
    view.render(elapsed);
    schedule();
    return view;
  } catch (error) {
    cleanup();
    throw error;
  }
}
