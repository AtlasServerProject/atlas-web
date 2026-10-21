import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { compileChannel, WalkAnimation } from './bedrock-animation';

type Vec3 = [number, number, number];
interface Cube { origin: Vec3; size: Vec3; uv: [number, number]; inflate?: number; pivot?: Vec3; rotation?: Vec3; mirror?: boolean; }
interface Bone { name: string; parent?: string; pivot?: Vec3; rotation?: Vec3; mirror?: boolean; cubes?: Cube[]; }
interface Model { 'minecraft:geometry': { description: { texture_width: number; texture_height: number }; bones: Bone[] }[]; }

/** Renders the original Bedrock geometry and atlas shipped with Cobblemon. */
export async function mountTorterra(host: HTMLElement, variant: string = '', interaction: (active: boolean) => void = () => {}): Promise<() => void> {
  const base = '/pokemon/torterra' + (variant ? '/' + variant : '');
  const walk = variant === 'cherry' ? base + '/walk.json' : '/pokemon/torterra/walk.json';
  const [response, animationResponse] = await Promise.all([fetch(base + '/model.json'), fetch(walk)]);
  if (!response.ok || !animationResponse.ok) throw new Error('Model unavailable');
  const animation = await animationResponse.json() as WalkAnimation;
  const data = (await response.json() as Model)['minecraft:geometry'][0];
  const texture = await new THREE.TextureLoader().loadAsync(base + '/texture.png');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.1, side: THREE.DoubleSide });
  const root = new THREE.Group();
  const groups = new Map<string, THREE.Group>();
  const pivots = new Map(data.bones.map(b => [b.name, b.pivot ?? [0, 0, 0] as Vec3]));
  const rotate = (object: THREE.Object3D, rotation?: Vec3) => {
    if (rotation) object.rotation.set(...rotation.map(THREE.MathUtils.degToRad) as Vec3, 'ZYX');
  };
  for (const bone of data.bones) groups.set(bone.name, new THREE.Group());
  for (const bone of data.bones) {
    const group = groups.get(bone.name)!;
    const pivot = pivots.get(bone.name)!;
    const parentPivot = bone.parent ? pivots.get(bone.parent)! : [0, 0, 0];
    group.position.set(pivot[0] - parentPivot[0], pivot[1] - parentPivot[1], pivot[2] - parentPivot[2]);
    rotate(group, bone.rotation);
    (bone.parent ? groups.get(bone.parent)! : root).add(group);
    for (const cube of bone.cubes ?? []) {
      const [x, y, z] = cube.size;
      const inflate = cube.inflate ?? 0;
      const geometry = new THREE.BoxGeometry(Math.max(x + 2 * inflate, .001), Math.max(y + 2 * inflate, .001), Math.max(z + 2 * inflate, .001));
      const [u, v] = cube.uv;
      // Bedrock box UV layout; BoxGeometry faces are +X, -X, +Y, -Y, +Z, -Z.
      const rects = [[u + z + x, v + z, z, y], [u, v + z, z, y], [u + z, v, x, z], [u + z + x, v, x, z], [u + 2 * z + x, v + z, x, y], [u + z, v + z, x, y]];
      const uv = geometry.getAttribute('uv');
      rects.forEach(([left, top, width, height], face) => {
        for (let vertex = 0; vertex < 4; vertex++) {
          const index = face * 4 + vertex;
          let s = uv.getX(index), t = uv.getY(index);
          if (cube.mirror ?? bone.mirror) s = 1 - s;
          if (face === 3) t = 1 - t;
          uv.setXY(index, (left + s * width) / data.description.texture_width, 1 - (top + (1 - t) * height) / data.description.texture_height);
        }
      });
      const mesh = new THREE.Mesh(geometry, material);
      const cubePivot = cube.pivot ?? pivot;
      const wrapper = new THREE.Group();
      wrapper.position.set(cubePivot[0] - pivot[0], cubePivot[1] - pivot[1], cubePivot[2] - pivot[2]);
      rotate(wrapper, cube.rotation);
      mesh.position.set(cube.origin[0] + x / 2 - cubePivot[0], cube.origin[1] + y / 2 - cubePivot[1], cube.origin[2] + z / 2 - cubePivot[2]);
      wrapper.add(mesh);
      group.add(wrapper);
    }
  }
  const tracks = Object.entries(animation.bones).flatMap(([name, channels]) => {
    const group = groups.get(name);
    if (!group) return [];
    return [{ group, position: group.position.clone(), rotation: group.rotation.clone(),
      samplePosition: channels.position === undefined ? undefined : compileChannel(channels.position),
      sampleRotation: channels.rotation === undefined ? undefined : compileChannel(channels.rotation),
      sampleScale: channels.scale === undefined ? undefined : compileChannel(channels.scale) }];
  });
  const pose = (time: number) => {
    for (const track of tracks) {
      track.group.position.copy(track.position);
      track.group.rotation.copy(track.rotation);
      if (track.samplePosition) {
        const offset = track.samplePosition(time);
        track.group.position.add(new THREE.Vector3(...offset));
      }
      if (track.sampleRotation) {
        const rotation = track.sampleRotation(time).map(THREE.MathUtils.degToRad);
        track.group.rotation.x += rotation[0];
        track.group.rotation.y += rotation[1];
        track.group.rotation.z += rotation[2];
      }
      if (track.sampleScale) track.group.scale.set(...track.sampleScale(time));
    }
  };
  const scene = new THREE.Scene();
  scene.add(root, new THREE.HemisphereLight(0xffffff, 0x8e9abb, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(-60, 100, -80);
  scene.add(light);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const size = bounds.getSize(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera();
  camera.position.set(95, 65, -120);
  camera.lookAt(0, 0, 0);
  camera.near = .1;
  camera.far = 500;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
  host.appendChild(renderer.domElement);
  const render = () => renderer.render(scene, camera);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI * .57;
  controls.minZoom = .85;
  controls.maxZoom = 1.65;
  controls.rotateSpeed = .65;
  controls.zoomSpeed = .6;
  controls.target.set(0, 0, 0);
  controls.update();
  controls.saveState();
  renderer.domElement.style.cursor = 'grab';
  const startInteraction = () => { renderer.domElement.style.cursor = 'grabbing'; interaction(true); };
  const endInteraction = () => { renderer.domElement.style.cursor = 'grab'; interaction(false); };
  controls.addEventListener('change', render);
  controls.addEventListener('start', startInteraction);
  controls.addEventListener('end', endInteraction);
  const keyboardTarget = host.parentElement ?? host;
  const keyboard = (event: KeyboardEvent) => {
    if (host.style.pointerEvents === 'none') return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R'].includes(event.key)) return;
    event.preventDefault();
    interaction(true);
    const orbit = new THREE.Spherical().setFromVector3(camera.position);
    if (event.key === 'ArrowLeft') orbit.theta -= .15;
    if (event.key === 'ArrowRight') orbit.theta += .15;
    if (event.key === 'ArrowUp') orbit.phi -= .1;
    if (event.key === 'ArrowDown') orbit.phi += .1;
    orbit.phi = THREE.MathUtils.clamp(orbit.phi, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.setFromSpherical(orbit);
    if (event.key === '+' || event.key === '=') camera.zoom *= 1.1;
    if (event.key === '-') camera.zoom /= 1.1;
    camera.zoom = THREE.MathUtils.clamp(camera.zoom, controls.minZoom, controls.maxZoom);
    if (event.key.toLowerCase() === 'r') controls.reset();
    camera.updateProjectionMatrix();
    controls.update();
    render();
    interaction(false);
  };
  keyboardTarget.addEventListener('keydown', keyboard);

  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const span = Math.max(size.y, size.x, size.z) * 1.24;
    camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
    camera.top = span / 2; camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };
  let frame = 0, lastTime: number | undefined, elapsed = 0, visible = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const tick = (now: number) => {
    if (lastTime !== undefined) elapsed += Math.min((now - lastTime) / 1000, .1);
    lastTime = now;
    pose(elapsed % animation.animation_length);
    render();
    frame = requestAnimationFrame(tick);
  };
  const updatePlayback = () => {
    cancelAnimationFrame(frame);
    lastTime = undefined;
    if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
  };
  const visibility = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    updatePlayback();
  });
  visibility.observe(host);
  document.addEventListener('visibilitychange', updatePlayback);
  motion.addEventListener('change', updatePlayback);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return () => {
    cancelAnimationFrame(frame);
    controls.removeEventListener('change', render);
    controls.removeEventListener('start', startInteraction);
    controls.removeEventListener('end', endInteraction);
    controls.dispose();
    keyboardTarget.removeEventListener('keydown', keyboard);
    visibility.disconnect();
    document.removeEventListener('visibilitychange', updatePlayback);
    motion.removeEventListener('change', updatePlayback);
    observer.disconnect();
    root.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    material.dispose(); texture.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
