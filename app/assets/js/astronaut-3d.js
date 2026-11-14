/*
 * Interactive 3D astronaut for the astronaut home (Three.js r170 with GLTFLoader, DRACOLoader and RoomEnvironment,
 * stored locally in assets/vendor/three/). Model: the EMU spacesuit from NASA 3D Resources (assets/models/emu.glb,
 * Draco-compressed, see CREDITS.txt). Inside the spacecraft nobody wears the spacewalk backpack, so the PLSS, the
 * SAFER jetpack and its hand controller (the bars the arms rested on) are removed when the model loads
 * (whole parts only: the suit keeps its original, smooth mesh).
 * 8 sensor dots sit on the suit surface, one per indicator, colored by status. Drag to turn, tap a dot to choose it.
 * The chosen dot becomes a white beacon (status color kept in its halo) and the others dim.
 * Loaded on demand by pages/home/home.js:
 *   const view = await mountAstronaut(host, { modelUrl, dracoPath, onSelect(key), onProject(key, x, y, visible) });
 *   view.setStatus({ hr: "ok", temp: "warn", ... "silent" }); view.select(key); view.turn(radians);
 * onProject reports, every frame, where the chosen dot is on screen (px inside host) so a card can follow it.
 * Colors come from the tokens in assets/css/colors.css. The canvas is decorative (aria-hidden):
 * the cards next to it are the accessible way in.
 */
import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "../vendor/three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "../vendor/three/addons/environments/RoomEnvironment.js";

const KEYS = ["sleep", "temp", "hr", "resp", "bp", "spo2", "hydration", "exercise"];
const HEIGHT = 4.4;

/*
 * Where each dot goes, as fractions of the model's box seen from the front (x: 0 = viewer's left, y: 0 = feet),
 * calibrated by screenshot for the EMU model (its SAFER jetpack makes the box wider than the body).
 * A ray from the front finds the suit surface at that spot. The astronaut's left side is on the viewer's right.
 */
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

// Yields to the browser between heavy steps (a timeout, so it also runs in a background tab)
function nextFrame() {
    return new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });
}

/*
 * Backpack removal. In the file's own space depth is y (front of the visor near 0, the torso's back up to about 0.3)
 * and the backpack sits behind it. Pieces are separated as connected components (vertices welded by position), and a
 * piece goes when its center lies behind the torso. Measured on the decoded mesh: the PLSS box, both SAFER towers,
 * their bolts and the two orange waist tethers that hook onto the backpack go (about 15 800 of 343 000 triangles);
 * torso, arms, legs and the small orange fittings stay.
 */
const BACKPACK_DEPTH = 0.25;
// Anything that still pokes out past the back of the torso (about 0.32)
const BACK_SURFACE = 0.34;
// The waist tethers (orange, material blinn12SG) run from the hips to the backpack: they go once they reach behind
const TETHER = /blinn12SG/;
const TETHER_REACH = 0.2;

/*
 * SAFER hand controller: on each side a bar runs from the backpack, under the forearm, to a block held in the hand,
 * so the arms looked propped on it. Height in the file is z (head near -0.4, feet near 1.6). Measured: the bars
 * (28 triangles, z 0.29 to 0.61, center |x| about 0.35), the blocks (208 triangles, z 0.40 to 0.67), each in two
 * copies (lambert2SG and emusuit5_lambert2SG), and the grip stick in each glove (blinn2SG, 400 triangles, z 0.43
 * to 0.55). A piece goes when it is small, sits wholly at hand height, away from the middle of the body, and reaches
 * in front of the torso; gloves (4 856 triangles) and the suit stay.
 */
const HAND_TOP = 0.25;
const HAND_BOTTOM = 0.7;
const HAND_SIDE = 0.2;
const HELD_MAX_TRIS = 500;

// Returns true when the part had backpack or hand controller pieces to remove
function trimGear(geometry, tether) {
    const index = geometry.index;
    const position = geometry.attributes.position;
    if (!index || !position || position.itemSize !== 3 || position.isInterleavedBufferAttribute) {
        return false;
    }
    // Parts that never reach behind the torso nor out to the hands (helmet, visor, front of the body) are left untouched
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
    // Weld vertices that share a position (seams split them), with a numeric key: 0.1 mm grid
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
    // Box (x, y = depth, z = height) and triangle count of each piece
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

// Removes the backpack (PLSS, SAFER, waist tethers) and the hand controller the arms rested on
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
        // One trimmed part per task keeps the page responsive
        if (trimmed) {
            await nextFrame();
        }
    }
}

export async function mountAstronaut(host, options) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Throws when WebGL is not available: the page keeps its poster and the cards
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // The suit has about 340 000 triangles: a lower pixel ratio on small screens keeps it smooth
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
    // Soft studio reflections for the gold visor and the fabric
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

    // The model, centered and scaled to a fixed height
    const figure = new THREE.Group();
    const root = new THREE.Group();
    figure.add(root);
    scene.add(figure);
    const model = gltf.scene;
    /*
     * The file faces sideways. Find the front from the model itself (body center -> gold visor)
     * and turn it to face the camera.
     */
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
    /*
     * The NASA export marks every material as glass (transmission 1), which washes the suit out.
     * Make the fabric opaque and matte, and the gold visor and trims metallic.
     */
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
    // The dot fractions (SPOTS) were calibrated on the full model box: measure it before the backpack goes
    const bounds = new THREE.Box3().setFromObject(model);
    await removeGear(model);
    // Turn around the body itself, not the old body + backpack center (height is unchanged)
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

    // Dots: placed on the suit surface by a ray from the front
    const raycaster = new THREE.Raycaster();
    const markers = {};
    const hits = [];
    const dotSize = HEIGHT * 0.012;
    KEYS.forEach(function (name) {
        const spot = SPOTS[name];
        const y = bounds.min.y + spot[1] * (bounds.max.y - bounds.min.y);
        // If the ray passes through a gap (e.g. between glove and jetpack handle), step toward the middle until it hits the suit
        let found = null;
        let fraction = spot[0];
        for (let step = 0; step < 20 && !found; step++) {
            const x = bounds.min.x + fraction * (bounds.max.x - bounds.min.x);
            raycaster.set(new THREE.Vector3(x, y, bounds.max.z + 5), new THREE.Vector3(0, 0, -1));
            found = raycaster.intersectObjects(bodyMeshes, false)[0] || null;
            fraction += (0.5 - spot[0]) / 20;
        }
        const point = found ? found.point.clone() : new THREE.Vector3(bounds.min.x + spot[0] * (bounds.max.x - bounds.min.x), y, bounds.max.z);
        // Sit just in front of the surface so no fold or panel hides the dot
        point.z += dotSize * 2;

        const group = new THREE.Group();
        group.position.copy(point);
        root.add(group);
        const material = new THREE.MeshBasicMaterial({ color: colors.ok, transparent: true });
        const haloMaterial = new THREE.MeshBasicMaterial({ color: colors.ok, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
        const dot = new THREE.Mesh(new THREE.SphereGeometry(dotSize, 16, 12), material);
        const halo = new THREE.Mesh(new THREE.RingGeometry(dotSize * 1.6, dotSize * 2.05, 32), haloMaterial);
        const outer = new THREE.Mesh(new THREE.RingGeometry(dotSize * 2.6, dotSize * 3, 32), haloMaterial);
        /*
         * Beacon for the chosen dot: a thick white ring with a thin dark edge (so it reads on the white suit)
         * and a crosshair of four white ticks. All of it always faces the camera.
         */
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

    /* ---------- State, turning and selection ---------- */
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

    /*
     * One place for how a dot looks: its status color (halo, and the core when not chosen),
     * plus the chosen state (white core and beacon) or the dimmed state (another dot is chosen).
     */
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
            // Every dot is on the front of the suit: face the front, turned a little toward the dot's side
            // (position is in the figure's own space; the extra depth keeps the turn gentle)
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

    // Slides the figure sideways (px on screen) to make room for the floating card
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

    /* ---------- Pointer: drag to turn, tap a dot to choose it ---------- */
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
                // Synthetic events have no active pointer to capture
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

    // A dot counts only when it is not hidden behind the body
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

    /* ---------- Where the chosen dot is on screen ---------- */
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

    /* ---------- Size and render loop (paused off screen and in hidden tabs) ---------- */
    function resize() {
        const width = host.clientWidth || 1;
        const height = host.clientHeight || 1;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // Fit the whole figure, a little high so it clears the turn buttons
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
            // Floating in microgravity, and a pulse on dots that need attention
            figure.position.y = Math.sin(time * 0.9) * 0.05;
            figure.rotation.z = Math.sin(time * 0.6) * 0.015;
            KEYS.forEach(function (name) {
                const marker = markers[name];
                const pulse = marker.status === "warn" || marker.status === "danger" ? 1 + 0.3 * (0.5 + 0.5 * Math.sin(time * 4)) : 1;
                marker.halo.scale.setScalar(pulse);
            });
        }
        // Rings always face the camera
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
        // For tests and the page: screen position (px inside host) of a dot
        screenOf: function (name) {
            figure.updateMatrixWorld(true);
            const point = markers[name].group.getWorldPosition(new THREE.Vector3()).project(camera);
            return { x: (point.x + 1) / 2 * host.clientWidth, y: (1 - point.y) / 2 * host.clientHeight };
        }
    };
}
