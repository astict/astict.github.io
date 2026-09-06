// Point d'entrée de l'application.
// L'ordre des imports/appels est important :
//   1. scene-setup crée la scène, la caméra, le renderer, les lumières (effets de bord au chargement)
//   2. loadModels() démarre le chargement asynchrone du PC et de la souris
//   3. animate() démarre la boucle de rendu (tourne en continu, dès la 1ère frame)
//   4. initUI() branche les composants d'interface (horloge, dock, langue)
import "./scene-setup.js";
import { loadModels } from "./model-loader.js";
import { animate } from "./interaction.js";
import { initUI } from "./ui.js";
import { initProjectPages } from "./project-page.js";

loadModels();
animate();
initUI();
initProjectPages();
