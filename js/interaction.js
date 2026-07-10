import * as THREE from "three";
import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { scene, camera, renderer, app, rig } from "./scene-setup.js";
import { raycaster, ndc, easeInOutCubic } from "./model-loader.js";
import { frameRig } from "./framing.js";

/* ——————————————————— PARALLAX / MOUVEMENT INTERACTIF ——————————————————— */
function onPointerMove(x, y) {
  // FIX: app.clientWidth/Height reflète la taille réelle du canvas après resize,
  // contrairement à window.innerWidth qui peut encore avoir l'ancienne valeur
  // dans le même frame que le resize (décalage NDC → parallax qui saute).
  const w = app.clientWidth;
  const h = app.clientHeight;
  state.targetNX = (x / w) * 2 - 1;
  state.targetNY = (y / h) * 2 - 1;
  state.lastPointerX = x;
  state.lastPointerY = y;
  state.pointerDirty = true;
}

// FIX: { passive: true } sur mousemove aussi → ne bloque plus le scroll/thread principal
window.addEventListener("mousemove", (e) => onPointerMove(e.clientX, e.clientY), { passive: true });
window.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

window.addEventListener("mouseleave", () => { state.targetNX = 0; state.targetNY = 0; });
window.addEventListener("touchend",    () => { state.targetNX = 0; state.targetNY = 0; });
window.addEventListener("touchcancel", () => { state.targetNX = 0; state.targetNY = 0; });

/* FIX: ResizeObserver sur #app au lieu de window "resize" + requestAnimationFrame.
   ResizeObserver se déclenche APRÈS le layout et AVANT le paint du navigateur,
   donc le canvas est toujours synchronisé avec sa taille réelle — plus de glitch
   quand on snappe une fenêtre côte à côte (YouTube, autre onglet, etc.).
   L'ancien système (resize + resizePending + RAF) pouvait rater des événements
   intermédiaires et laisser le canvas à l'ancienne taille pendant 1-2 frames. */
new ResizeObserver(() => {
  const w = app.clientWidth;
  const h = app.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  // Recalcule les coordonnées parallax avec les nouvelles dimensions
  state.targetNX = (state.lastPointerX / w) * 2 - 1;
  state.targetNY = (state.lastPointerY / h) * 2 - 1;
  if (state.pcLoaded && state.mouseLoaded) frameRig();
}).observe(app);

/* ——————————————————— BOUCLE D'ANIMATION ——————————————————— */
const root = document.documentElement;
const clock = new THREE.Clock();

// FIX: valeurs précédentes de --px/--py pour éviter les setProperty inutiles
let prevPX = null, prevPY = null;

export function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  state.elapsedTime += delta;

  const k = 1 - Math.exp(-CONFIG.followSpeed * delta);
  state.currentNX += (state.targetNX - state.currentNX) * k;
  state.currentNY += (state.targetNY - state.currentNY) * k;

  rig.rotation.y = state.currentNX * CONFIG.maxYaw;
  rig.rotation.x = THREE.MathUtils.degToRad(CONFIG.baseTiltDeg) + state.currentNY * CONFIG.maxPitch;

  const dolly = state.currentNY * CONFIG.maxDolly;
  camera.position.set(state.camCenter.x, state.camCenter.y, state.camCenter.z + state.baseCamDistance - dolly);
  camera.lookAt(state.camCenter.x, state.camLookY, state.camCenter.z);

  if (state.hingeTween) {
    const t = Math.min((state.elapsedTime - state.hingeTween.startTime) / state.hingeTween.duration, 1);
    state.screenHinge.quaternion.slerpQuaternions(state.hingeTween.from, state.hingeTween.to, easeInOutCubic(t));
    if (t >= 1) state.hingeTween = null;
  }

  // FIX: raycaster pour le curseur uniquement si la souris a bougé depuis la dernière frame
  if (state.pcGroup && state.pointerDirty) {
    ndc.x = (state.lastPointerX / window.innerWidth) * 2 - 1;
    ndc.y = -((state.lastPointerY / window.innerHeight) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    const hovering = raycaster.intersectObject(state.pcGroup, true).length > 0;
    document.body.style.cursor = hovering ? "pointer" : "default";
    state.pointerDirty = false;
  }

  // FIX: CSS vars --px/--py mises à jour seulement si la valeur a changé (2 décimales suffisent)
  const pxStr = state.currentNX.toFixed(2);
  const pyStr = state.currentNY.toFixed(2);
  if (pxStr !== prevPX) { root.style.setProperty("--px", pxStr); prevPX = pxStr; }
  if (pyStr !== prevPY) { root.style.setProperty("--py", pyStr); prevPY = pyStr; }

  renderer.render(scene, camera);
}
