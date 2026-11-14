import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "../vendor/three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "../vendor/three/addons/environments/RoomEnvironment.js";
const KEYS = ["sleep", "temp", "hr", "resp", "bp", "spo2", "hydration", "exercise"];
const HEIGHT = 4.4;
const SPOTS = {
sleep: [0.5, 0.965],
temp: [0.5, 0.775],
hr: [0.6, 0.66],
resp: [0.4, 0.66],
bp: [0.8, 0.64],
spo2: [0.25, 0.62],
hydration: [0.5, 0.52],
exercise: [0.6, 0.3]
};
function token(name) {
return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function nextFrame() {
return new Promise(function (resolve) {
setTimeout(resolve, 0);
});
}
const BACKPACK_DEPTH = 0.25;
const BACK_SURFACE = 0.34;
const TETHER = /blinn12SG/;
const TETHER_REACH = 0.2;
const HAND_TOP = 0.25;
const HAND_BOTTOM = 0.7;
const HAND_SIDE = 0.2;
const HELD_MAX_TRIS = 500;
function trimGear(geometry, tether) {
const index = geometry.index;
const position = geometry.attributes.position;
if (!index || !position || position.itemSize !== 3 || position.isInterleavedBufferAttribute) {
return false;
}
if (!geometry.boundingBox) {
geometry.computeBoundingBox();
}
const bbox = geometry.boundingBox;
const reachesHands = bbox.max.z >= HAND_TOP && bbox.min.z <= HAND_BOTTOM && Math.max(-bbox.min.x, bbox.max.x) >= HAND_SIDE;
if (bbox.max.y <= BACKPACK_DEPTH && !reachesHands) {
return false;
}
const xyz = position.array;
const ids = index.array;
const count = position.count;
const welded = new Int32Array(count);
const seen = new Map();
for (let i = 0; i < count; i++) {
const key = ((Math.round(xyz[i * 3] * 1e4) + 20000) * 40001 + Math.round(xyz[i * 3 + 1] * 1e4) + 20000) * 40001 + Math.round(xyz[i * 3 + 2] * 1e4) + 20000;
const first = seen.get(key);
if (first === undefined) {
seen.set(key, i);
welded[i] = i;
} else {
welded[i] = first;
}
}
const parent = new Int32Array(count);
for (let i = 0; i < count; i++) {
parent[i] = i;
}
function find(x) {
while (parent[x] !== x) {
parent[x] = parent[parent[x]];
x = parent[x];
}
return x;
}
const faces = ids.length;
for (let f = 0; f < faces; f += 3) {
const a = find(welded[ids[f]]);
parent[find(welded[ids[f + 1]])] = a;
parent[find(welded[ids[f + 2]])] = a;
}
const minX = new Float32Array(count).fill(Infinity);
const maxX = new Float32Array(count).fill(-Infinity);
const minY = new Float32Array(count).fill(Infinity);
const maxY = new Float32Array(count).fill(-Infinity);
const minZ = new Float32Array(count).fill(Infinity);
const maxZ = new Float32Array(count).fill(-Infinity);
const tris = new Uint32Array(count);
for (let i = 0; i < count; i++) {
const root = find(welded[i]);
const x = xyz[i * 3];
const y = xyz[i * 3 + 1];
const z = xyz[i * 3 + 2];
minX[root] = Math.min(minX[root], x);
maxX[root] = Math.max(maxX[root], x);
minY[root] = Math.min(minY[root], y);
maxY[root] = Math.max(maxY[root], y);
minZ[root] = Math.min(minZ[root], z);
maxZ[root] = Math.max(maxZ[root], z);
}
for (let f = 0; f < faces; f += 3) {
tris[find(welded[ids[f]])] += 1;
}
function isBackpack(root) {
return (minY[root] + maxY[root]) / 2 > BACKPACK_DEPTH || maxY[root] > (tether ? TETHER_REACH : BACK_SURFACE);
}
function isHeld(root) {
return tris[root] < HELD_MAX_TRIS && minZ[root] >= HAND_TOP && maxZ[root] <= HAND_BOTTOM &&
Math.abs((minX[root] + maxX[root]) / 2) >= HAND_SIDE && minY[root] < 0;
}
const kept = new (count > 65535 ? Uint32Array : Uint16Array)(faces);
let length = 0;
for (let f = 0; f < faces; f += 3) {
const root = find(welded[ids[f]]);
if (!isBackpack(root) && !isHeld(root)) {
kept[length] = ids[f];
kept[length + 1] = ids[f + 1];
kept[length + 2] = ids[f + 2];
length += 3;
}
}
if (length === faces) {
return false;
}
geometry.setIndex(new THREE.BufferAttribute(kept.slice(0, length), 1));
geometry.computeBoundingBox();
geometry.computeBoundingSphere();
return true;
}
async function removeGear(model) {
const meshes = [];
model.traverse(function (child) {
if (child.isMesh) {
meshes.push(child);
}
});
for (const mesh of meshes) {
if (/jetpack2SG/.test(mesh.material.name)) {
mesh.removeFromParent();
continue;
}
const trimmed = trimGear(mesh.geometry, TETHER.test(mesh.material.name));
if (trimmed) {
await nextFrame();
}
}
}
export async function mountAstronaut(host, options) {
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.domElement.className = "astronaut-view__canvas-el";
renderer.domElement.setAttribute("aria-hidden", "true");
const draco = new DRACOLoader();
draco.setDecoderPath(options.dracoPath);
const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(options.modelUrl);
draco.dispose();
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();
scene.environmentIntensity = 0.45;
renderer.toneMappingExposure = 0.9;
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
const colors = {
ok: token("--color-ring-ok"),
warn: token("--color-status-warn"),
danger: token("--color-status-danger-line"),
silent: token("--color-suit"),
light: token("--color-3d-light"),
ground: token("--color-visor"),
rim: token("--color-projection")
};
scene.add(new THREE.HemisphereLight(colors.light, colors.ground, 0.6));
const key = new THREE.DirectionalLight(colors.light, 1.8);
key.position.set(3, 5, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(colors.light, 0.4);
fill.position.set(-5, 1, 3);
scene.add(fill);
const rim = new THREE.DirectionalLight(colors.rim, 2);
rim.position.set(-3, 3, -6);
scene.add(rim);
const figure = new THREE.Group();
const root = new THREE.Group();
figure.add(root);
scene.add(figure);
const model = gltf.scene;
model.updateMatrixWorld(true);
const visor = new THREE.Box3();
model.traverse(function (child) {
if (child.isMesh && /blinn3SG/.test(child.material.name)) {
visor.expandByObject(child);
}
});
if (!visor.isEmpty()) {
const front = visor.getCenter(new THREE.Vector3()).sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
model.rotation.y = Math.atan2(-front.x, front.z);
model.updateMatrixWorld(true);
}
model.traverse(function (child) {
if (!child.isMesh) {
return;
}
(Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) {
material.transmission = 0;
if (/blinn[13]SG/.test(material.name)) {
material.metalness = 0.9;
material.roughness = 0.22;
} else {
material.metalness = 0;
material.roughness = Math.min(material.roughness, 0.8);
}
material.needsUpdate = true;
});
});
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());
model.scale.setScalar(HEIGHT / size.y);
const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
model.position.sub(center);
root.add(model);
root.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(model);
await removeGear(model);
root.updateMatrixWorld(true);
const body = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
model.position.x -= body.x;
model.position.z -= body.z;
bounds.translate(new THREE.Vector3(-body.x, 0, -body.z));
root.updateMatrixWorld(true);
const bodyMeshes = [];
model.traverse(function (child) {
if (child.isMesh) {
bodyMeshes.push(child);
}
});
const raycaster = new THREE.Raycaster();
const markers = {};
const hits = [];
const dotSize = HEIGHT * 0.012;
KEYS.forEach(function (name) {
const spot = SPOTS[name];
const y = bounds.min.y + spot[1] * (bounds.max.y - bounds.min.y);
let found = null;
let fraction = spot[0];
for (let step = 0; step < 20 && !found; step++) {
const x = bounds.min.x + fraction * (bounds.max.x - bounds.min.x);
raycaster.set(new THREE.Vector3(x, y, bounds.max.z + 5), new THREE.Vector3(0, 0, -1));
found = raycaster.intersectObjects(bodyMeshes, false)[0] || null;
fraction += (0.5 - spot[0]) / 20;
}
const point = found ? found.point.clone() : new THREE.Vector3(bounds.min.x + spot[0] * (bounds.max.x - bounds.min.x), y, bounds.max.z);
point.z += dotSize * 2;
const group = new THREE.Group();
group.position.copy(point);
root.add(group);
const material = new THREE.MeshBasicMaterial({ color: colors.ok, transparent: true });
const haloMaterial = new THREE.MeshBasicMaterial({ color: colors.ok, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
const dot = new THREE.Mesh(new THREE.SphereGeometry(dotSize, 16, 12), material);
const halo = new THREE.Mesh(new THREE.RingGeometry(dotSize * 1.6, dotSize * 2.05, 32), haloMaterial);
const outer = new THREE.Mesh(new THREE.RingGeometry(dotSize * 2.6, dotSize * 3, 32), haloMaterial);
const beacon = new THREE.Group();
const beaconWhite = new THREE.MeshBasicMaterial({ color: colors.light, side: THREE.DoubleSide, depthWrite: false });
const beaconEdge = new THREE.MeshBasicMaterial({ color: colors.ground, side: THREE.DoubleSide, depthWrite: false });
beacon.add(new THREE.Mesh(new THREE.RingGeometry(dotSize * 2.5, dotSize * 3.6, 40), beaconEdge));
beacon.add(new THREE.Mesh(new THREE.RingGeometry(dotSize * 2.75, dotSize * 3.35, 40), beaconWhite));
[0, 1, 2, 3].forEach(function (quarter) {
const tick = new THREE.Mesh(new THREE.PlaneGeometry(dotSize * 1.9, dotSize * 0.55), beaconWhite);
const angle = quarter * Math.PI / 2;
tick.position.set(Math.cos(angle) * dotSize * 4.7, Math.sin(angle) * dotSize * 4.7, 0);
tick.rotation.z = angle;
beacon.add(tick);
});
const hit = new THREE.Mesh(new THREE.SphereGeometry(dotSize * 3.4, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
hit.userData.key = name;
outer.visible = false;
beacon.visible = false;
group.add(dot, halo, outer, beacon, hit);
hits.push(hit);
markers[name] = { group: group, dot: dot, halo: halo, outer: outer, ring: beacon, material: material, haloMaterial: haloMaterial, status: "ok" };
});
let selected = null;
let angle = -0.3;
let target = null;
let velocity = 0;
let dragging = false;
let visible = true;
let frame = 0;
let shift = 0;
let shiftTarget = 0;
const clock = new THREE.Clock();
function paint(name) {
const marker = markers[name];
const status = marker.status;
const color = status === "silent" ? colors.silent : colors[status] || colors.ok;
const chosen = selected === name;
const dimmed = selected !== null && !chosen;
marker.material.color.set(chosen ? colors.light : color);
marker.material.opacity = dimmed ? 0.35 : 1;
marker.haloMaterial.color.set(color);
marker.haloMaterial.opacity = dimmed ? 0.25 : status === "silent" ? 0.4 : 0.9;
marker.outer.visible = status === "danger";
marker.ring.visible = chosen;
marker.dot.scale.setScalar(chosen ? 1.8 : 1);
}
function setStatus(map) {
Object.keys(map).forEach(function (name) {
const marker = markers[name];
if (!marker) {
return;
}
marker.status = map[name];
paint(name);
});
wake();
}
function select(name) {
selected = name && markers[name] ? name : null;
KEYS.forEach(paint);
if (name && markers[name]) {
const point = markers[name].group.position;
let goal = -Math.atan2(point.x, Math.max(point.z, 0) + 1.5);
while (goal - angle > Math.PI) {
goal -= 2 * Math.PI;
}
while (goal - angle < -Math.PI) {
goal += 2 * Math.PI;
}
target = goal;
velocity = 0;
}
wake();
}
function setShift(px) {
const unitsPerPx = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(15))) / (host.clientHeight || 1);
shiftTarget = px * unitsPerPx;
wake();
}
function turn(delta) {
target = (target === null ? angle : target) + delta;
velocity = 0;
wake();
}
const canvas = renderer.domElement;
const pointer = new THREE.Vector2();
let startX = 0;
let lastX = 0;
let moved = 0;
canvas.addEventListener("pointerdown", function (event) {
dragging = true;
startX = lastX = event.clientX;
moved = 0;
target = null;
velocity = 0;
if (canvas.setPointerCapture && event.pointerId !== undefined) {
try {
canvas.setPointerCapture(event.pointerId);
} catch (error) {
}
}
wake();
});
canvas.addEventListener("pointermove", function (event) {
if (!dragging) {
return;
}
const dx = event.clientX - lastX;
lastX = event.clientX;
moved = Math.max(moved, Math.abs(event.clientX - startX));
angle += dx * 0.012;
velocity = reduced ? 0 : dx * 0.012;
});
canvas.addEventListener("pointerup", function (event) {
dragging = false;
if (moved < 6) {
pick(event.clientX, event.clientY);
}
});
canvas.addEventListener("pointercancel", function () {
dragging = false;
});
function pick(clientX, clientY) {
const rect = canvas.getBoundingClientRect();
pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
raycaster.setFromCamera(pointer, camera);
const found = raycaster.intersectObjects(hits.concat(bodyMeshes), false);
if (!found.length) {
return;
}
const first = found[0];
const nearby = first.object.userData.key ? first : found.filter(function (entry) {
return entry.object.userData.key && entry.distance - first.distance < dotSize * 4;
})[0];
if (nearby) {
options.onSelect(nearby.object.userData.key);
}
}
const projected = new THREE.Vector3();
function project() {
if (!options.onProject || !selected) {
return;
}
markers[selected].group.getWorldPosition(projected);
const distance = projected.distanceTo(camera.position);
raycaster.set(camera.position, projected.clone().sub(camera.position).normalize());
const blocker = raycaster.intersectObjects(bodyMeshes, false)[0];
const shown = !blocker || blocker.distance > distance - dotSize * 3;
projected.project(camera);
options.onProject(selected, (projected.x + 1) / 2 * host.clientWidth, (1 - projected.y) / 2 * host.clientHeight, shown);
}
function resize() {
const width = host.clientWidth || 1;
const height = host.clientHeight || 1;
renderer.setSize(width, height, false);
camera.aspect = width / height;
const distance = (HEIGHT * 0.62) / Math.tan(THREE.MathUtils.degToRad(15)) * (camera.aspect < 0.7 ? 0.7 / camera.aspect : 1);
camera.position.set(0, -0.3, distance);
camera.lookAt(0, -0.3, 0);
camera.updateProjectionMatrix();
wake();
}
function draw() {
const time = clock.getElapsedTime();
if (target !== null) {
angle += (target - angle) * (reduced ? 1 : 0.12);
if (Math.abs(target - angle) < 0.002) {
angle = target;
target = null;
}
} else if (!dragging && Math.abs(velocity) > 0.0005) {
angle += velocity;
velocity *= 0.92;
}
figure.rotation.y = angle;
shift += (shiftTarget - shift) * (reduced ? 1 : 0.15);
if (Math.abs(shiftTarget - shift) < 0.001) {
shift = shiftTarget;
}
figure.position.x = shift;
if (!reduced) {
figure.position.y = Math.sin(time * 0.9) * 0.05;
figure.rotation.z = Math.sin(time * 0.6) * 0.015;
KEYS.forEach(function (name) {
const marker = markers[name];
const pulse = marker.status === "warn" || marker.status === "danger" ? 1 + 0.3 * (0.5 + 0.5 * Math.sin(time * 4)) : 1;
marker.halo.scale.setScalar(pulse);
});
}
figure.updateMatrixWorld(true);
const turnBack = figure.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.quaternion);
KEYS.forEach(function (name) {
const marker = markers[name];
marker.halo.quaternion.copy(turnBack);
marker.outer.quaternion.copy(turnBack);
marker.ring.quaternion.copy(turnBack);
});
renderer.render(scene, camera);
project();
}
function busy() {
return !reduced || dragging || target !== null || Math.abs(velocity) > 0.0005 || shift !== shiftTarget;
}
function loop() {
frame = 0;
if (!visible || document.hidden) {
return;
}
draw();
if (busy()) {
frame = requestAnimationFrame(loop);
}
}
function wake() {
if (!frame) {
frame = requestAnimationFrame(loop);
}
}
if ("IntersectionObserver" in window) {
new IntersectionObserver(function (entries) {
visible = entries[0].isIntersecting;
wake();
}).observe(host);
}
document.addEventListener("visibilitychange", wake);
if ("ResizeObserver" in window) {
new ResizeObserver(resize).observe(host);
}
resize();
return {
setStatus: setStatus,
select: select,
turn: turn,
setShift: setShift,
keys: KEYS,
screenOf: function (name) {
figure.updateMatrixWorld(true);
const point = markers[name].group.getWorldPosition(new THREE.Vector3()).project(camera);
return { x: (point.x + 1) / 2 * host.clientWidth, y: (1 - point.y) / 2 * host.clientHeight };
}
};
}