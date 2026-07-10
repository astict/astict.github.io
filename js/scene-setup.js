import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

/* ——————————————————— SCÈNE / CAMÉRA / RENDU ——————————————————— */
export const app = document.getElementById("app");

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x22242c, 0.35);

export const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 0.3, 1);

// FIX: powerPreference "high-performance" pour demander le GPU dédié sur dual-GPU
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
// FIX: pixel ratio plafonné à 2 (1.5 sur mobile pour éviter les lags GPU)
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
// FIX: false = ne pas écraser le style CSS du canvas avec des px fixes.
// Le canvas reste "width:100%;height:100%" via CSS, et le buffer WebGL
// est dimensionné correctement par setSize. Cela évite le désalignement
// canvas/viewport pendant un resize (ex. snap côte-à-côte sous Windows).
renderer.setSize(app.clientWidth, app.clientHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.insertBefore(renderer.domElement, app.firstChild);

export const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

const pmrem = new THREE.PMREMGenerator(renderer);
const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTexture;
scene.environmentIntensity = 0.95;
// FIX: on dispose le générateur PMREM APRÈS avoir assigné la texture à la scène
// (dispose() ne détruit pas la texture, uniquement les ressources internes du générateur)
pmrem.dispose();

/* ——————————————————— LUMIÈRES ——————————————————— */
const ambient = new THREE.AmbientLight(0x5a5e6a, 0.9);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xf0f2f8, 4.0);
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

const frontFill = new THREE.DirectionalLight(0xaab0bd, 1.6);
frontFill.position.set(0.3, 1.5, 3.0);
scene.add(frontFill);

const rimLight = new THREE.DirectionalLight(0x6a72c0, 1.6);
rimLight.position.set(1.0, 0.5, -4.0);
scene.add(rimLight);

const haloLight = new THREE.PointLight(0x7a82a0, 1.0, 3.0, 2);
haloLight.position.set(0, 0.8, 1.5);
scene.add(haloLight);

const softbox = new THREE.RectAreaLight(0xeef0f5, 3.2, 0.9, 0.5);
softbox.position.set(0, 1.1, 0.4);
softbox.lookAt(0, 0, 0.3);
scene.add(softbox);

/* ——————————————————— SOL ——————————————————— */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.25, color: 0x101114 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

export const rig = new THREE.Group();
scene.add(rig);
