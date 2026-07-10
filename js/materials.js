import * as THREE from "three";
import { maxAnisotropy } from "./scene-setup.js";

/* ——————————————————— TEXTURE D'ÉCRAN (fond d'écran "vague de particules") ——————————————————— */
export function createScreenWallpaperTexture() {
  const w = 1024, h = 640;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Fond très sombre, légèrement dégradé
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "#0c0e13");
  bgGrad.addColorStop(1, "#05060a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Grille de points formant des vagues (effet "topographie / data wave")
  const cols = 70, rows = 36;
  const marginX = w * 0.04, marginY = h * 0.12;
  const spanX = w - marginX * 2, spanY = h - marginY * 2;

  for (let row = 0; row < rows; row++) {
    ctx.beginPath();
    let first = true;
    for (let col = 0; col <= cols; col++) {
      const u = col / cols;
      const v = row / (rows - 1);
      const x = marginX + u * spanX;

      const wave =
        Math.sin(u * 9.5 + v * 2.2) * 22 * (0.4 + v) +
        Math.sin(u * 4.0 - v * 5.0) * 14 * (1 - v * 0.5) +
        Math.cos(u * 14.0 + v * 1.5) * 6;

      const y = marginY + v * spanY + wave;

      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);

      // Points lumineux ponctuels
      const brightness = 0.15 + Math.max(0, Math.sin(u * 9.5 + v * 2.2)) * 0.55;
      if (col % 2 === 0) {
        ctx.fillStyle = `rgba(210,220,235,${brightness.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = `rgba(170,185,210,${(0.05 + row / rows * 0.10).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Vignette douce
  const vignette = ctx.createRadialGradient(w/2, h/2, h*0.1, w/2, h/2, h*0.85);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  return texture;
}

export const screenWallpaper = createScreenWallpaperTexture();

/* ——————————————————— TRAITEMENT DES MATÉRIAUX ——————————————————— */
export function processMaterial(material, meshName) {
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

    // L'écran LCD lui-même (matériau "Bezel.003" dans le modèle, malgré son nom)
    if (name.includes("bezel")) {
      mat.color = new THREE.Color(0x000000);
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveMap = screenWallpaper;
      mat.emissiveIntensity = 1.0;
      mat.roughness = 0.05;
      mat.metalness = 0.0;
      mat.needsUpdate = true;
      return;
    }

    if (mesh.includes("display") || mesh.includes("screengasket")) {
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
