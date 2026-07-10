import * as THREE from "three";

/* ——————————————————————————————————————————————————————————
   État partagé entre les modules three.js.
   Regroupé ici plutôt qu'en variables globales éparpillées,
   pour que model-loader.js, framing.js et interaction.js
   puissent tous lire/écrire les mêmes valeurs sans dépendre
   les uns des autres directement.
   ——————————————————————————————————————————————————————————— */
export const state = {
  // Modèles chargés (PC + souris)
  pcGroup: null,
  pcSize: null,
  mouseGroup: null,
  mouseSize: null,
  pcLoaded: false,
  mouseLoaded: false,

  // Ouverture/fermeture animée de l'écran (charnière)
  screenHinge: null,
  hingeOpenQuat: null,
  hingeClosedQuat: null,
  pcOpen: true,
  hingeTween: null,
  elapsedTime: 0,

  // Cadrage caméra (voir framing.js -> frameRig)
  baseCamDistance: 1,
  camCenter: new THREE.Vector3(),
  camLookY: 0,
  referenceSize: null,
  referenceCenter: null,

  // Parallax / pointeur (souris + tactile)
  targetNX: 0,
  targetNY: 0,
  currentNX: 0,
  currentNY: 0,
  lastPointerX: window.innerWidth / 2,
  lastPointerY: window.innerHeight / 2,
  pointerDirty: false
};
