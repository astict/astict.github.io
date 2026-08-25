import * as THREE from "three";
import { maxAnisotropy } from "./scene-setup.js";

/* ——————————————————— TEXTURES D'ÉCRAN (images réelles) ——————————————————— */
const textureLoader = new THREE.TextureLoader();

// La vraie dalle LCD est le mesh "Display.001". Dans le fichier source, elle
// partage le matériau alu du châssis ("GreyMetalic.002") et n'occupe qu'une
// sous-région du UV 0-1 (mesurée directement dans le .gltf), pas tout l'espace.
// Sans ce recalage, l'image se retrouverait recadrée sur cette petite zone
// centrale au lieu de remplir toute la dalle.
const SCREEN_UV = { uMin: 0.2102, uMax: 0.7800, vMin: 0.2700, vMax: 0.7900 };
// Ratio largeur/hauteur réel de la dalle, mesuré sur la géométrie (≈ 1.52:1)
const SCREEN_ASPECT = 1.50;

// Combine un recadrage façon "background-size: cover" (pour ne pas déformer une
// image 16:9 sur une dalle ≈1.52:1) ET le recalage vers la sous-région UV réelle.
function fitTextureToScreen(texture) {
  const img = texture.image;
  if (!img) return;

  const uSpan = SCREEN_UV.uMax - SCREEN_UV.uMin;
  const vSpan = SCREEN_UV.vMax - SCREEN_UV.vMin;
  const imageAspect = img.width / img.height;

  let coverRepeatX = 1, coverRepeatY = 1, coverOffsetX = 0, coverOffsetY = 0;
  if (imageAspect > SCREEN_ASPECT) {
    coverRepeatX = SCREEN_ASPECT / imageAspect;
    coverOffsetX = (1 - coverRepeatX) / 2;
  } else {
    coverRepeatY = imageAspect / SCREEN_ASPECT;
    coverOffsetY = (1 - coverRepeatY) / 2;
  }

  texture.repeat.set(coverRepeatX / uSpan, coverRepeatY / vSpan);
  texture.offset.set(
    coverOffsetX - (SCREEN_UV.uMin / uSpan) * coverRepeatX,
    coverOffsetY - (SCREEN_UV.vMin / vSpan) * coverRepeatY
  );

  // Le modèle (export Blender) a l'UV de la dalle inversé verticalement :
  // l'image apparaissait tête en bas. On retourne donc uniquement cet axe.
  texture.offset.y += texture.repeat.y;
  texture.repeat.y *= -1;

  texture.needsUpdate = true;
}

function loadWallpaperTexture(path) {
  const texture = textureLoader.load(
    path,
    (tex) => {
      tex.anisotropy = maxAnisotropy;
      fitTextureToScreen(tex);
    },
    undefined,
    (err) => {
      console.error(`Impossible de charger l'image d'écran "${path}". Vérifie qu'elle est bien présente à cet emplacement.`, err);
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Fond d'écran par défaut (affiché au chargement + quand la souris quitte "FOXY")
export const defaultWallpaper = loadWallpaperTexture("model/2D/Wallpaper_-_spes_-_home.png");
// Fond d'écran affiché au survol du bouton "FOXY"
export const gameWallpaper = loadWallpaperTexture("model/2D/Foxy_game.png");

// Référence(s) vers le matériau dédié de la dalle (clone, voir setupScreenMaterial),
// pour pouvoir changer l'image affichée à la volée (survol dock).
export const screenMaterials = [];

/**
 * Change l'image affichée sur l'écran du laptop.
 * @param {THREE.Texture} texture
 */
export function setScreenWallpaper(texture) {
  screenMaterials.forEach((mat) => {
    mat.emissiveMap = texture;
    mat.needsUpdate = true;
  });
}

/**
 * Configure le matériau CLONÉ de la dalle LCD (mesh "Display.001").
 * Ce clone est nécessaire car ce mesh partage par défaut le même matériau que
 * le châssis alu — sans clone, le modifier affecterait aussi le reste de la coque.
 * À appeler depuis model-loader.js avec le matériau déjà cloné pour ce mesh.
 */
export function setupScreenMaterial(mat) {
  mat.color = new THREE.Color(0x000000);
  mat.emissive = new THREE.Color(0xffffff);
  mat.emissiveMap = defaultWallpaper;
  mat.emissiveIntensity = 1.0;
  mat.roughness = 0.05;
  mat.metalness = 0.0;
  mat.map = null; // évite que la texture alu du châssis transparaisse sous l'image
  mat.needsUpdate = true;
  screenMaterials.push(mat);
}

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

    // Contour/rebord autour de la dalle (matériau "Bezel.003" dans le modèle).
    // La vraie dalle LCD est gérée séparément par setupScreenMaterial() dans
    // model-loader.js (mesh "Display.001"), pas ici.
    if (name.includes("bezel")) {
      mat.color = new THREE.Color(0x05060a);
      mat.roughness = 0.35;
      mat.metalness = 0.1;
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