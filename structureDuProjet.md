# Structure du projet (découpée)

```
monPortfolio/

├── index.html
├── css/
│   ├── base.css           variables, reset, fond, canvas, .dot/.pulse
│   ├── header.css         en-tête + navbar animée (navpill, navitem…)
│   ├── rails.css          rails décoratifs gauche/droite
│   ├── dock.css           dock de filtres en bas d'écran
│   ├── corner-tools.css   sélecteur de langue, horloge, boutons ronds
│   ├── loader.css         écran de chargement + indice "hint"
│   └── responsive.css     media queries (reduced-motion, mobile)
├── js/
│   ├── config.js          CONFIG (réglages du rig 3D) + détection reduced-motion
│   ├── state.js           état partagé et mutable (modèles chargés, parallax, charnière…)
│   ├── scene-setup.js     scène, caméra, renderer, lumières, sol, rig
│   ├── materials.js       texture d'écran + traitement des matériaux du modèle
│   ├── framing.js         fitObject() + frameRig() (cadrage caméra)
│   ├── model-loader.js    chargement GLTF (PC + souris), charnière d'écran, clic
│   ├── interaction.js     parallax souris/tactile, resize, boucle d'animation
│   ├── ui.js              horloge, filtrage du dock, sélecteur de langue
│   └── main.js            point d'entrée : importe et démarre le tout
└── model/                 
    ├── 2D/                roueBateau.svg
    ├── 3D/                AppleLogo.png, myMouseTECKNET.bin, myMouseTECKNET.gltf, thePC.bin, thePC.gltf, Top.png
    ├── flag/              es.svg, fr.webp, gb.svg, se.svg
    ├── mp4/               Fish.webm    
```


