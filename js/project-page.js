import * as THREE from "three";
import { state } from "./state.js";
import { camera } from "./scene-setup.js";
import { easeInOutCubic } from "./model-loader.js";

/* ———————————————————————————————————————————————————————————
   ZOOM ÉCRAN → PAGE PROJET
   Au clic sur un item du dock qui a une page projet (data-project),
   la caméra "rentre" dans l'écran du laptop (dolly + recadrage vers
   la dalle "Display.001"), puis la page overlay correspondante
   apparaît (fondu + léger scale). Le bouton "X" fait l'inverse :
   referme la page et ramène la caméra à son cadrage d'origine.
   ——————————————————————————————————————————————————————————— */

const ZOOM_DURATION = 0.8;     // secondes, aligné sur pcLidAnimDuration pour rester cohérent
const ZOOM_DISTANCE = 0.025;   // distance caméra ↔ dalle une fois "à l'intérieur" de l'écran

const uiFadeTargets = document.querySelectorAll(
  "#header, #dock, #cornerTools, #clock, .rail, #hint"
);

// Un seul restore actif à la fois (une page ouverte à la fois)
let restore = null;

function getScreenWorldPosition(fallback) {
  if (!state.screenMesh) return fallback.clone();
  // getWorldPosition() renvoie l'origine locale du mesh, qui n'est pas forcément
  // son centre visuel (pivot d'export Blender arbitraire) — d'où un zoom qui
  // atterrissait plus bas, vers le clavier. On vise plutôt le centre de sa
  // bounding box monde, qui correspond au centre réel de la dalle affichée.
  const box = new THREE.Box3().setFromObject(state.screenMesh);
  if (box.isEmpty()) return fallback.clone();
  return box.getCenter(new THREE.Vector3());
}

function setUIHidden(hidden) {
  uiFadeTargets.forEach((el) => el.classList.toggle("ui-hidden", hidden));
}

function getPage(key) {
  return document.querySelector(`.project-page[data-project="${key}"]`);
}

/**
 * Lance le zoom caméra vers l'écran puis révèle la page projet `key`
 * (doit correspondre à un attribut data-project sur un .project-page).
 */
export function openProjectPage(key) {
  const page = getPage(key);
  if (!page) return;
  if (state.zooming || state.zoomTween) return; // une transition est déjà en cours

  const fallbackLook = new THREE.Vector3(state.camCenter.x, state.camLookY, state.camCenter.z);
  const screenPos = getScreenWorldPosition(fallbackLook);

  const fromPos = camera.position.clone();
  const fromLook = fallbackLook;
  const dir = fromPos.clone().sub(screenPos).normalize();
  const toPos = screenPos.clone().add(dir.multiplyScalar(ZOOM_DISTANCE));

  restore = { fromPos, fromLook, key };

  state.zooming = true;
  setUIHidden(true);
  page.setAttribute("aria-hidden", "false");

  state.zoomTween = {
    startTime: state.elapsedTime,
    duration: ZOOM_DURATION,
    fromPos,
    toPos,
    fromLook,
    toLook: screenPos.clone(),
    onComplete: () => {
      page.classList.add("open");
    }
  };
}

/** Referme la page projet actuellement ouverte et ramène la caméra en arrière. */
export function closeProjectPage() {
  if (!restore) return;
  const page = getPage(restore.key);
  if (page) {
    page.classList.remove("open");
    page.setAttribute("aria-hidden", "true");
  }

  const fallbackLook = new THREE.Vector3(state.camCenter.x, state.camLookY, state.camCenter.z);
  const screenPos = getScreenWorldPosition(fallbackLook);

  const { fromPos, fromLook } = restore;
  restore = null;

  state.zoomTween = {
    startTime: state.elapsedTime,
    duration: ZOOM_DURATION,
    fromPos: camera.position.clone(),
    toPos: fromPos,
    fromLook: screenPos.clone(),
    toLook: fromLook,
    onComplete: () => {
      state.zooming = false;
      setUIHidden(false);
    }
  };
}

/**
 * Câble les déclencheurs (dock + boutons de fermeture + Échap).
 * À appeler une seule fois, depuis main.js.
 */
export function initProjectPages() {
  document.querySelectorAll(".dockitem[data-project]").forEach((btn) => {
    btn.addEventListener("click", () => openProjectPage(btn.getAttribute("data-project")));
  });

  document.querySelectorAll(".project-page .project-page__close").forEach((btn) => {
    btn.addEventListener("click", closeProjectPage);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && restore) closeProjectPage();
  });
}