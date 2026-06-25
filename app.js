import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

/* ——————————————————— CONFIG ——————————————————— */
const CONFIG = {
  pcTargetWidth: 0.34,
  mouseTargetLength: 0.12,
  gapRatio: 0.18,
  mouseForwardRatio: 0.18,
  mouseYawDeg: 164,
  cameraPadding: 2.4,
  verticalFocus: 0.04,
  maxYaw: 0.22,
  maxPitch: 0.10,
  maxDolly: 0.05,
  followSpeed: 5.5,
  pcLidCloseAngleDeg: 90,
  pcLidAnimDuration: 0.9
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (prefersReducedMotion) {
  CONFIG.maxYaw = 0;
  CONFIG.maxPitch = 0;
  CONFIG.maxDolly = 0;
}

/* ——————————————————— SCÈNE / CAMÉRA / RENDU ——————————————————— */
const app = document.getElementById("app");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a2540, 0.35);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 0.3, 1);

// FIX: powerPreference "high-performance" pour demander le GPU dédié sur dual-GPU
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
// FIX: pixel ratio plafonné à 2 (1.5 sur mobile pour éviter les lags GPU)
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.insertBefore(renderer.domElement, app.firstChild);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

/* ——————————————————— TRAITEMENT DES MATÉRIAUX ——————————————————— */
function processMaterial(material, meshName) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((mat) => {
    if (!mat) return;

    const name = (mat.name || "").toLowerCase();
    const mesh = (meshName || "").toLowerCase();

    const mapKeys = ["map", "emissiveMap", "roughnessMap", "metalnessMap", "normalMap", "clearcoatMap", "aoMap"];
    mapKeys.forEach((key) => {
      const tex = mat[key];
      if (!tex) return;
      tex.anisotropy = maxAnisotropy;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    });

    if (name.includes("bezel") || mesh.includes("display") || mesh.includes("screengasket")) {
      mat.color = new THREE.Color(0x080c14);
      mat.roughness = 0.05;
      mat.metalness = 0.0;
      mat.needsUpdate = true;
      return;
    }

    if (name.includes("apple") || mesh.includes("apple")) {
      if (!mat.map) {
        mat.color = new THREE.Color(0xd0d8e8);
        mat.roughness = 0.1;
        mat.metalness = 0.8;
      }
      mat.needsUpdate = true;
      return;
    }

    if (name.includes("keyboard") || mesh.includes("keyboard")) {
      mat.roughness = 0.65;
      mat.metalness = 0.0;
      if (mat.map) {
        mat.map.anisotropy = maxAnisotropy;
        mat.map.needsUpdate = true;
      }
      mat.needsUpdate = true;
      return;
    }

    if (name.includes("black") || name.includes("rubber") || name.includes("soft")) {
      mat.color = new THREE.Color(0x0a0c10);
      mat.roughness = 0.85;
      mat.metalness = 0.0;
      mat.needsUpdate = true;
      return;
    }

    if (name.includes("silver") || name.includes("grey") || name.includes("main") || name === "") {
      // Space Gray (était 0x8a9ab5, trop clair et trop réfléchissant)
      mat.color = new THREE.Color(0x2a2c32);
      mat.roughness = 0.22;
      mat.metalness = 0.88;
      mat.envMapIntensity = 0.8;
      mat.needsUpdate = true;
      return;
    }

    // Fallback sombre (était 0x6a7a90, trop clair)
    mat.color = new THREE.Color(0x252830);
    mat.roughness = 0.28;
    mat.metalness = 0.70;
    mat.needsUpdate = true;
  });
}

const pmrem = new THREE.PMREMGenerator(renderer);
const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTexture;
scene.environmentIntensity = 0.95;
// FIX: on dispose le générateur PMREM APRÈS avoir assigné la texture à la scène
// (dispose() ne détruit pas la texture, uniquement les ressources internes du générateur)
pmrem.dispose();

/* ——————————————————— LUMIÈRES ——————————————————— */
const ambient = new THREE.AmbientLight(0x3a4f7a, 0.9);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xc8d8ff, 4.0);
keyLight.position.set(-2.0, 4.5, 2.5);
keyLight.castShadow = true;
// FIX: shadow map réduite de 4096→2048 — divide GPU VRAM par 4, quasi-imperceptible visuellement
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.2;
keyLight.shadow.camera.far = 12;
keyLight.shadow.camera.left = -2.5;
keyLight.shadow.camera.right = 2.5;
keyLight.shadow.camera.top = 2.5;
keyLight.shadow.camera.bottom = -2.5;
keyLight.shadow.bias = -0.0003;
scene.add(keyLight);

const frontFill = new THREE.DirectionalLight(0x8ab0e0, 1.6);
frontFill.position.set(0.3, 1.5, 3.0);
scene.add(frontFill);

const rimLight = new THREE.DirectionalLight(0x4470cc, 2.0);
rimLight.position.set(1.0, 0.5, -4.0);
scene.add(rimLight);

const haloLight = new THREE.PointLight(0x6080c0, 1.2, 3.0, 2);
haloLight.position.set(0, 0.8, 1.5);
scene.add(haloLight);

const softbox = new THREE.RectAreaLight(0xdce8ff, 3.2, 0.9, 0.5);
softbox.position.set(0, 1.1, 0.4);
softbox.lookAt(0, 0, 0.3);
scene.add(softbox);

/* ——————————————————— SOL ——————————————————— */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.25, color: 0x0a1020 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

const rig = new THREE.Group();
scene.add(rig);

/* ——————————————————— OUTILS CADRAGE ——————————————————— */
function fitObject(object, { rotateUpFix = true } = {}) {
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

let baseCamDistance = 1;
let camCenter = new THREE.Vector3();
let camLookY = 0;

function frameRig() {
  const box = new THREE.Box3().setFromObject(rig);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const distanceForHeight = (size.y / 2) / Math.tan(vFov / 2);
  const distanceForWidth = (size.x / 2) / (Math.tan(vFov / 2) * camera.aspect);
  const distance = Math.max(distanceForHeight, distanceForWidth) * CONFIG.cameraPadding;

  camCenter.set(center.x, center.y + size.y * 0.5, center.z);
  camLookY = center.y + size.y * CONFIG.verticalFocus;
  baseCamDistance = distance;

  camera.position.set(camCenter.x, camCenter.y, camCenter.z + distance);
  camera.lookAt(camCenter.x, camLookY, camCenter.z);
  // FIX: updateProjectionMatrix() appelé une seule fois ici, pas en doublon dans resize
  camera.updateProjectionMatrix();
}

/* ——————————————————— CHARGEMENT DES MODÈLES ——————————————————— */
const loaderEl = document.getElementById("loader");
const loaderBar = document.getElementById("loaderBar");
const loaderLabel = document.getElementById("loaderLabel");
const loaderError = document.getElementById("loaderError");
const hint = document.getElementById("hint");

const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  const pct = total ? Math.round((loaded / total) * 100) : 0;
  loaderBar.style.width = pct + "%";
  loaderLabel.textContent = "CHARGEMENT DES MODÈLES… " + pct + "%";
};
manager.onError = (url) => {
  loaderError.style.display = "block";
  loaderError.textContent = "Impossible de charger : " + url + ". Vérifie tes liens.";
};

const dracoLoader = new DRACOLoader(manager);
dracoLoader.setDecoderPath("https://unpkg.com/three@0.165.0/examples/jsm/libs/draco/");

const gltfLoader = new GLTFLoader(manager);
gltfLoader.setDRACOLoader(dracoLoader);

let pcGroup = null, pcSize = null;
let mouseGroup = null, mouseSize = null;
let pcLoaded = false, mouseLoaded = false;

/* — Ouverture/fermeture animée de l'écran — */
let screenHinge = null;
let hingeOpenQuat = null;
let hingeClosedQuat = null;
let pcOpen = true;
let hingeTween = null;
let elapsedTime = 0;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function togglePc() {
  if (!screenHinge || !hingeOpenQuat || !hingeClosedQuat) return;
  pcOpen = !pcOpen;
  hingeTween = {
    from: screenHinge.quaternion.clone(),
    to: (pcOpen ? hingeOpenQuat : hingeClosedQuat).clone(),
    startTime: elapsedTime,
    duration: CONFIG.pcLidAnimDuration
  };
}

function onSceneClick(clientX, clientY) {
  if (!pcGroup) return;
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -((clientY / window.innerHeight) * 2 - 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(pcGroup, true);
  if (hits.length > 0) togglePc();
}

renderer.domElement.addEventListener("click", (e) => onSceneClick(e.clientX, e.clientY));

function tryPositionMouse() {
  if (!pcGroup || !mouseGroup) return;
  const gap = pcSize.x * CONFIG.gapRatio;
  mouseGroup.position.x = pcSize.x / 2 + gap + mouseSize.x / 2;
  mouseGroup.position.z = pcSize.z * CONFIG.mouseForwardRatio;
  mouseGroup.rotation.y = THREE.MathUtils.degToRad(CONFIG.mouseYawDeg);
}

function onBothLoaded() {
  if (!pcLoaded || !mouseLoaded) return;
  tryPositionMouse();
  frameRig();
  loaderEl.classList.add("hide");
  hint.classList.add("show");
  setTimeout(() => hint.classList.remove("show"), 4500);
}

// Portable
gltfLoader.load("model/3D/thePC.gltf", (gltf) => {
  gltf.scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      processMaterial(node.material, node.name);
    }
  });

  screenHinge = null;
  let appleLogo = null;
  gltf.scene.traverse((node) => {
    if (!screenHinge && /rotate/i.test(node.name) && /screen/i.test(node.name)) {
      screenHinge = node;
    }
    if (!appleLogo && /apple/i.test(node.name)) {
      appleLogo = node;
    }
  });

  if (screenHinge) {
    if (appleLogo && appleLogo.parent !== screenHinge) {
      gltf.scene.updateMatrixWorld(true);
      screenHinge.attach(appleLogo);
    }

    hingeOpenQuat = screenHinge.quaternion.clone();
    const closeDelta = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      THREE.MathUtils.degToRad(CONFIG.pcLidCloseAngleDeg)
    );
    hingeClosedQuat = new THREE.Quaternion().multiplyQuaternions(closeDelta, hingeOpenQuat);
  } else {
    console.warn('Aucun node "rotate…screen…" trouvé : ouverture/fermeture désactivée.');
  }

  const rawSize = fitObject(gltf.scene);
  const scaleFactor = CONFIG.pcTargetWidth / rawSize.x;

  pcGroup = new THREE.Group();
  pcGroup.add(gltf.scene);
  pcGroup.scale.setScalar(scaleFactor);
  rig.add(pcGroup);

  pcSize = rawSize.clone().multiplyScalar(scaleFactor);
  pcLoaded = true;
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

  mouseGroup = new THREE.Group();
  mouseGroup.add(gltf.scene);
  mouseGroup.scale.setScalar(scaleFactor);
  rig.add(mouseGroup);

  mouseSize = rawSize.clone().multiplyScalar(scaleFactor);
  mouseLoaded = true;
  onBothLoaded();
}, undefined, (err) => console.error(err));

/* ——————————————————— PARALLAX / MOUVEMENT INTERACTIF ——————————————————— */
let targetNX = 0, targetNY = 0;
let currentNX = 0, currentNY = 0;
let lastPointerX = window.innerWidth / 2, lastPointerY = window.innerHeight / 2;

// FIX: flag pour éviter de recalculer le hover si la souris n'a pas bougé
let pointerDirty = false;

function onPointerMove(x, y) {
  targetNX = (x / window.innerWidth) * 2 - 1;
  targetNY = (y / window.innerHeight) * 2 - 1;
  lastPointerX = x;
  lastPointerY = y;
  pointerDirty = true;
}

// FIX: { passive: true } sur mousemove aussi → ne bloque plus le scroll/thread principal
window.addEventListener("mousemove", (e) => onPointerMove(e.clientX, e.clientY), { passive: true });
window.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

window.addEventListener("mouseleave", () => { targetNX = 0; targetNY = 0; });
window.addEventListener("touchend",    () => { targetNX = 0; targetNY = 0; });
window.addEventListener("touchcancel", () => { targetNX = 0; targetNY = 0; });

/* FIX: throttle du resize avec requestAnimationFrame pour éviter les appels répétés
   pendant le redimensionnement manuel de la fenêtre */
let resizePending = false;
window.addEventListener("resize", () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (pcLoaded && mouseLoaded) frameRig();
    resizePending = false;
  });
});

/* ——————————————————— BOUCLE D'ANIMATION ——————————————————— */
const root = document.documentElement;
const clock = new THREE.Clock();

// FIX: valeurs précédentes de --px/--py pour éviter les setProperty inutiles
let prevPX = null, prevPY = null;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  elapsedTime += delta;

  const k = 1 - Math.exp(-CONFIG.followSpeed * delta);
  currentNX += (targetNX - currentNX) * k;
  currentNY += (targetNY - currentNY) * k;

  rig.rotation.y = currentNX * CONFIG.maxYaw;
  rig.rotation.x = currentNY * CONFIG.maxPitch;

  const dolly = currentNY * CONFIG.maxDolly;
  camera.position.set(camCenter.x, camCenter.y, camCenter.z + baseCamDistance - dolly);
  camera.lookAt(camCenter.x, camLookY, camCenter.z);

  if (hingeTween) {
    const t = Math.min((elapsedTime - hingeTween.startTime) / hingeTween.duration, 1);
    screenHinge.quaternion.slerpQuaternions(hingeTween.from, hingeTween.to, easeInOutCubic(t));
    if (t >= 1) hingeTween = null;
  }

  // FIX: raycaster pour le curseur uniquement si la souris a bougé depuis la dernière frame
  if (pcGroup && pointerDirty) {
    ndc.x = (lastPointerX / window.innerWidth) * 2 - 1;
    ndc.y = -((lastPointerY / window.innerHeight) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    const hovering = raycaster.intersectObject(pcGroup, true).length > 0;
    document.body.style.cursor = hovering ? "pointer" : "default";
    pointerDirty = false;
  }

  // FIX: CSS vars --px/--py mises à jour seulement si la valeur a changé (2 décimales suffisent)
  const pxStr = currentNX.toFixed(2);
  const pyStr = currentNY.toFixed(2);
  if (pxStr !== prevPX) { root.style.setProperty("--px", pxStr); prevPX = pxStr; }
  if (pyStr !== prevPY) { root.style.setProperty("--py", pyStr); prevPY = pyStr; }

  renderer.render(scene, camera);
}
animate();

/* ——————————————————— UI & COMPOSANTS INTERACTIFS DOM ——————————————————— */
(function () {
  // Horloge — FIX: mise à jour toutes les 60s (suffisant pour HH:MM), et correction
  // du formatage du fuseau horaire (Math.floor + minutes résiduels)
  const timeEl = document.getElementById("clockTime");
  const zoneEl = document.getElementById("clockZone");

  function updateClock() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    });
    const offsetMin = -now.getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMin);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    zoneEl.textContent = "GMT" + sign + h + (m ? ":" + String(m).padStart(2, "0") : "");
  }
  updateClock();
  // Synchronise le tick sur la prochaine minute entière pour plus de précision
  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();
  setTimeout(() => {
    updateClock();
    setInterval(updateClock, 60_000);
  }, msToNextMinute);

  // Thème Light/Dark
  const themeBtn = document.getElementById("themeBtn");

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    document.documentElement.setAttribute("data-theme", "light");
  }

  themeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  // Gestion des Langues
  const langBtn = document.getElementById("langBtn");
  const langMenu = document.querySelector(".langMenu");
  const roleLabel = document.querySelector("#roleLabel span");
  const statusLabel = document.getElementById("statusLabel");
  const navItems = document.querySelectorAll(".navitem");
  const dockItems = document.querySelectorAll(".dockitem");

  const translations = {
    fr: { role: "DÉVELOPPEUR WEB", status: "DISPONIBLE" },
    en: { role: "WEB DEVELOPER",   status: "AVAILABLE"  },
    es: { role: "DESARROLLADOR WEB", status: "DISPONIBLE" },
    sv: { role: "WEBBUTVECKLARE", status: "TILLGÄNGLIG" }
  };

  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = langMenu.classList.toggle("open");
    langBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", () => {
    langMenu.classList.remove("open");
    langBtn.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      langMenu.classList.remove("open");
      langBtn.setAttribute("aria-expanded", "false");
    }
  });

  document.querySelectorAll("#langDropdown button").forEach(btn => {
    btn.addEventListener("click", () => {
      const selectedLang = btn.getAttribute("data-lang");

      if (translations[selectedLang]) {
        roleLabel.textContent = translations[selectedLang].role;
        statusLabel.textContent = translations[selectedLang].status;
      }

      navItems.forEach(item => {
        const text = item.getAttribute("data-" + selectedLang) || item.getAttribute("data-fr");
        item.querySelector(".lbl").textContent = text;
      });

      dockItems.forEach(item => {
        const text = item.getAttribute("data-" + selectedLang) || item.getAttribute("data-fr");
        item.querySelector(".lbl").textContent = text;
      });
    });
  });
})();