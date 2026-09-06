import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { camera, renderer, rig } from "./scene-setup.js";
import { processMaterial, setupScreenMaterial } from "./materials.js";
import { fitObject, frameRig } from "./framing.js";

/* ——————————————————— CHARGEMENT DES MODÈLES ——————————————————— */
const loaderEl = document.getElementById("loader");
const loaderPct = document.getElementById("loaderPct");
const loaderError = document.getElementById("loaderError");
const hint = document.getElementById("hint");

const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  const pct = total ? Math.round((loaded / total) * 100) : 0;
  loaderPct.textContent = pct + "%";
};
manager.onError = (url) => {
  loaderError.style.display = "block";
  loaderError.textContent = "Impossible de charger : " + url + ". Vérifie tes liens.";
};

const dracoLoader = new DRACOLoader(manager);
dracoLoader.setDecoderPath("https://unpkg.com/three@0.165.0/examples/jsm/libs/draco/");

const gltfLoader = new GLTFLoader(manager);
gltfLoader.setDRACOLoader(dracoLoader);

/* — Ouverture/fermeture animée de l'écran — */
export const raycaster = new THREE.Raycaster();
export const ndc = new THREE.Vector2();

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function togglePc() {
  if (!state.screenHinge || !state.hingeOpenQuat || !state.hingeClosedQuat) return;
  state.pcOpen = !state.pcOpen;
  state.hingeTween = {
    from: state.screenHinge.quaternion.clone(),
    to: (state.pcOpen ? state.hingeOpenQuat : state.hingeClosedQuat).clone(),
    startTime: state.elapsedTime,
    duration: CONFIG.pcLidAnimDuration
  };
}

function onSceneClick(clientX, clientY) {
  if (!state.pcGroup) return;
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -((clientY / window.innerHeight) * 2 - 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(state.pcGroup, true);
  if (hits.length > 0) togglePc();
}

renderer.domElement.addEventListener("click", (e) => onSceneClick(e.clientX, e.clientY));

function tryPositionMouse() {
  if (!state.pcGroup || !state.mouseGroup) return;
  const gap = state.pcSize.x * CONFIG.gapRatio;
  state.mouseGroup.position.x = state.pcSize.x / 2 + gap + state.mouseSize.x / 2;
  state.mouseGroup.position.z = state.pcSize.z * CONFIG.mouseForwardRatio;
  state.mouseGroup.rotation.y = THREE.MathUtils.degToRad(CONFIG.mouseYawDeg);
}

function onBothLoaded() {
  if (!state.pcLoaded || !state.mouseLoaded) return;
  tryPositionMouse();
  frameRig();
  loaderPct.textContent = "100%";
  loaderEl.classList.add("hide");
  hint.classList.add("show");
  setTimeout(() => hint.classList.remove("show"), 4500);
}

/**
 * Lance le chargement des deux modèles GLTF (PC + souris).
 * À appeler une seule fois, depuis main.js.
 */
export function loadModels() {
  // Portable
  gltfLoader.load("model/3D/thePC.gltf", (gltf) => {
    let screenMeshFound = false;
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;

        // "Display.001" = la vraie dalle LCD. Dans le fichier source, elle partage
        // par défaut le matériau alu du châssis ("GreyMetalic.002") : on le clone
        // pour cette dalle uniquement, sinon la modifier affecterait aussi le
        // reste de la coque (BaseCover, Main Body, Trackpad, etc.).
        // Comparaison "assainie" (sans ponctuation/casse) pour tolérer d'éventuelles
        // variations de nommage entre exports ("Display.001", "Display001", etc.).
        const sanitized = (node.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (sanitized === "display001") {
          screenMeshFound = true;
          state.screenMesh = node;
          const sharedMat = Array.isArray(node.material) ? node.material[0] : node.material;
          const screenMat = sharedMat.clone();
          node.material = screenMat;
          setupScreenMaterial(screenMat);
        } else {
          processMaterial(node.material, node.name);
        }
      }
    });
    if (!screenMeshFound) {
      console.warn('Aucun mesh "Display.001" trouvé : l\'image d\'écran ne peut pas être appliquée. Noms de mesh disponibles :',
        (() => { const names = []; gltf.scene.traverse((n) => { if (n.isMesh) names.push(n.name); }); return names; })()
      );
    }

    state.screenHinge = null;
    let appleLogo = null;
    gltf.scene.traverse((node) => {
      if (!state.screenHinge && /rotate/i.test(node.name) && /screen/i.test(node.name)) {
        state.screenHinge = node;
      }
      if (!appleLogo && /apple/i.test(node.name)) {
        appleLogo = node;
      }
    });

    if (state.screenHinge) {
      if (appleLogo && appleLogo.parent !== state.screenHinge) {
        gltf.scene.updateMatrixWorld(true);
        state.screenHinge.attach(appleLogo);
      }

      state.hingeOpenQuat = state.screenHinge.quaternion.clone();
      const closeDelta = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        THREE.MathUtils.degToRad(CONFIG.pcLidCloseAngleDeg)
      );
      state.hingeClosedQuat = new THREE.Quaternion().multiplyQuaternions(closeDelta, state.hingeOpenQuat);
    } else {
      console.warn('Aucun node "rotate…screen…" trouvé : ouverture/fermeture désactivée.');
    }

    const rawSize = fitObject(gltf.scene);
    const scaleFactor = CONFIG.pcTargetWidth / rawSize.x;

    state.pcGroup = new THREE.Group();
    state.pcGroup.add(gltf.scene);
    state.pcGroup.scale.setScalar(scaleFactor);
    rig.add(state.pcGroup);

    state.pcSize = rawSize.clone().multiplyScalar(scaleFactor);
    state.pcLoaded = true;
    onBothLoaded();
  }, undefined, (err) => console.error(err));

  // Souris
  gltfLoader.load("model/3D/myMouseTECKNET.gltf", (gltf) => {
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach(mat => {
          if (!mat) return;
          mat.color = new THREE.Color(0x1e2026);   // Gris anthracite foncé
          mat.roughness = 0.78;
          mat.metalness = 0.0;
          mat.needsUpdate = true;
        });
      }
    });

    const rawSize = fitObject(gltf.scene);
    const referenceDim = Math.max(rawSize.x, rawSize.z);
    const scaleFactor = CONFIG.mouseTargetLength / referenceDim;

    state.mouseGroup = new THREE.Group();
    state.mouseGroup.add(gltf.scene);
    state.mouseGroup.scale.setScalar(scaleFactor);
    rig.add(state.mouseGroup);

    state.mouseSize = rawSize.clone().multiplyScalar(scaleFactor);
    state.mouseLoaded = true;
    onBothLoaded();
  }, undefined, (err) => console.error(err));
}