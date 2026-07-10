import * as THREE from "three";
import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { camera, rig } from "./scene-setup.js";

/* ——————————————————— OUTILS CADRAGE ——————————————————— */
export function fitObject(object, { rotateUpFix = true } = {}) {
  let box = new THREE.Box3().setFromObject(object);
  let center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  if (rotateUpFix) {
    box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const dims = [
      { axis: "x", val: size.x },
      { axis: "y", val: size.y },
      { axis: "z", val: size.z }
    ].sort((a, b) => a.val - b.val);
    const upAxis = dims[0].axis;

    if (upAxis === "z") object.rotation.x = Math.PI / 2;
    else if (upAxis === "x") object.rotation.z = -Math.PI / 2;
  }

  box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const finalCenter = box.getCenter(new THREE.Vector3());
  object.position.x -= finalCenter.x;
  object.position.z -= finalCenter.z;
  object.position.y -= box.min.y;

  return size;
}

// BUG FIX (PC qui "saute" vers le haut quand l'écran est fermé + qu'on revient d'un autre onglet) :
// Avant, frameRig() recalculait la bounding box du "rig" à CHAQUE appel.
// Or quand l'écran est fermé, le rig est beaucoup plus plat/petit que quand il est ouvert.
// Si un resize (ou un évènement assimilé, déclenché par le navigateur quand on revient
// sur l'onglet) appelait frameRig() pendant que l'écran était fermé, la caméra se recalait
// alors sur cette petite boîte fermée → distance et centre totalement différents → le PC
// semblait "sauter". On fige donc UNE FOIS pour toutes la taille de référence (calculée
// pendant que l'écran est ouvert, à son premier chargement), et on s'en sert à chaque
// appel de frameRig(), peu importe l'état (ouvert/fermé) au moment de l'appel.
export function frameRig() {
  if (!state.referenceSize) {
    const initialBox = new THREE.Box3().setFromObject(rig);
    if (initialBox.isEmpty()) return;
    state.referenceSize = initialBox.getSize(new THREE.Vector3());
    state.referenceCenter = initialBox.getCenter(new THREE.Vector3());
  }

  const size = state.referenceSize;
  const center = state.referenceCenter;

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const distanceForHeight = (size.y / 2) / Math.tan(vFov / 2);
  const distanceForWidth = (size.x / 2) / (Math.tan(vFov / 2) * camera.aspect);
  const distance = Math.max(distanceForHeight, distanceForWidth) * CONFIG.cameraPadding;

  // FIX viewport-shift: camCenter.y doit rester à center.y (hauteur neutre).
  // L'ancienne valeur (center.y + size.y * 0.5) plaçait la caméra au sommet de
  // la bounding box ; quand la fenêtre rétrécit (snap côte-à-côte), baseCamDistance
  // augmente fortement → l'angle de plongée diminue → les modèles remontaient
  // visuellement. Avec camera.y == center.y, la position verticale des objets
  // est stable quelle que soit la distance caméra / l'aspect ratio.
  state.camCenter.set(center.x, center.y, center.z);
  state.camLookY = center.y + size.y * CONFIG.verticalFocus;
  state.baseCamDistance = distance;

  camera.position.set(state.camCenter.x, state.camCenter.y, state.camCenter.z + distance);
  camera.lookAt(state.camCenter.x, state.camLookY, state.camCenter.z);
  // FIX: updateProjectionMatrix() appelé une seule fois ici, pas en doublon dans resize
  camera.updateProjectionMatrix();
}
