/* ——————————————————— UI & COMPOSANTS INTERACTIFS DOM ——————————————————— */
import { setScreenWallpaper, defaultWallpaper, gameWallpaper } from "./materials.js";

/**
 * Initialise l'horloge, le filtrage du dock et le sélecteur de langue.
 * À appeler une seule fois, depuis main.js.
 */
export function initUI() {
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

  /* ——————————————————— FILTRAGE INTERACTIF DU DOCK ——————————————————— */
  const navItemsList = document.querySelectorAll(".navitem");
  const dockItemsList = document.querySelectorAll(".dockitem");
  const homeBtn = document.querySelector(".navpill .icobtn");

  const categoryMap = {
    "01": "projets",
    "02": "apropos",
    "03": "competences",
    "04": "contact"
  };

  // FIX: on ne pose plus transform/opacity/display en style inline sur les
  // .dockitem. Un style inline a une spécificité plus forte que n'importe
  // quelle règle CSS, y compris .dockitem:hover — une fois posé, le hover
  // (translateY(-2px)) ne pouvait donc plus jamais s'appliquer après un
  // premier clic dans la navbar. On pilote désormais l'affichage via des
  // classes CSS (.dockitem--hidden / .dockitem--enter), ce qui laisse le
  // :hover du CSS reprendre la main normalement.
  function showDockItem(dockItem) {
    dockItem.classList.remove("dockitem--hidden");
    dockItem.classList.add("dockitem--enter");
    // Double rAF : on force le navigateur à peindre l'état "entrant" (opacité 0)
    // avant de retirer la classe, pour obtenir un vrai fondu au lieu d'un saut.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => dockItem.classList.remove("dockitem--enter"));
    });
  }

  function hideDockItem(dockItem) {
    dockItem.classList.add("dockitem--hidden");
    dockItem.classList.remove("dockitem--enter");
  }

  navItemsList.forEach(item => {
    item.addEventListener("click", () => {
      const num = item.getAttribute("data-num");
      const targetCat = categoryMap[num];

      dockItemsList.forEach(dockItem => {
        if (dockItem.getAttribute("data-cat") === targetCat) {
          showDockItem(dockItem);
        } else {
          hideDockItem(dockItem);
        }
      });
    });
  });

  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      dockItemsList.forEach(dockItem => showDockItem(dockItem));
    });
  }

  /* ——————————————————— WALLPAPER ÉCRAN AU SURVOL / CLIC ——————————————————— */
  // Associe chaque item du dock ayant une page projet (data-project) à un fond
  // d'écran dédié. Au clic, ce fond reste "épinglé" tant que l'utilisateur ne
  // survole pas un autre item du dock — à ce moment-là seulement l'épingle
  // saute, et l'écran redevient un simple aperçu au survol (comportement normal).
  const wallpaperByProject = { foxy: gameWallpaper };
  let pinnedKey = null;

  function wallpaperFor(key) {
    return (key && wallpaperByProject[key]) || defaultWallpaper;
  }

  dockItemsList.forEach((item) => {
    const key = item.getAttribute("data-project");

    item.addEventListener("mouseenter", () => {
      if (key !== pinnedKey) pinnedKey = null; // survol d'une autre catégorie : on désépingle
      setScreenWallpaper(wallpaperFor(key));
    });

    item.addEventListener("mouseleave", () => {
      setScreenWallpaper(wallpaperFor(pinnedKey));
    });

    item.addEventListener("click", () => {
      if (key) {
        pinnedKey = key;
        setScreenWallpaper(wallpaperFor(key));
      }
    });
  });

  // Gestion des Langues
  const langBtn = document.getElementById("langBtn");
  const langMenu = document.querySelector(".langMenu");
  const roleLabel = document.querySelector("#roleLabel span");
  const statusLabel = document.getElementById("statusLabel");
  const navItems = document.querySelectorAll(".navitem");
  const dockItems = document.querySelectorAll(".dockitem");
  const loaderLabel = document.getElementById("loaderLabel");

  const translations = {
    fr: { role: "ÉTUDIANT", status: "🚧 SITE EN CONSTRUCTION" },
    en: { role: "STUDENT",   status: "🚧 WEBSITE UNDER CONSTRUCTION"  },
    es: { role: "ESTUDIANTE", status: "🚧 SITIO EN CONSTRUCCIÓN" },
    sv: { role: "STUDENT", status: "🚧 WEBBPLATS UNDER UPPMYNANDE" }
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

      const loaderText = loaderLabel.getAttribute("data-" + selectedLang) || loaderLabel.getAttribute("data-fr");
      if (loaderText) loaderLabel.textContent = loaderText;
      // -----------------------------------
    });
  });
}