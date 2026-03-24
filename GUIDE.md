# Guide Technique — Moody

Guide d'apprentissage progressif des frameworks utilisés dans le projet Moody.
Mis à jour au fil du développement.

---

## Table des matières

- [Angular](#angular)
- [Electron](#electron)
- [Konva.js](#konvajs)
- [Frames](#frames)
- [Menu contextuel](#menu-contextuel)
- [Raccourcis reconfigurables](#raccourcis-reconfigurables)
- [Connexion front/back](#connexion-frontback)
- [JavaScript — concepts clés](#javascript--concepts-clés)
- [Générer un `.moody` en Python](#générer-un-moody-en-python)
- [Spring Boot](#spring-boot)
- [Docker Compose](#docker-compose)

---

## Angular

### Qu'est-ce qu'Angular ?

Angular est un framework frontend développé par Google. Contrairement à React (librairie), Angular est un framework **complet** : il inclut nativement le routing, les formulaires, le client HTTP, l'injection de dépendances, etc.

### Initialisation du projet

```bash
npx ng new front --skip-git --style=scss --ssr=false --routing=true
```

| Option | Explication |
|---|---|
| `ng new front` | Crée un projet Angular dans le dossier `front/` |
| `--skip-git` | Pas de `git init` dans `front/` — on gère le git à la racine du monorepo |
| `--style=scss` | Utilise SCSS au lieu de CSS (permet variables, nesting, mixins) |
| `--ssr=false` | Désactive le Server-Side Rendering — inutile dans une app Electron |
| `--routing=true` | Active le routeur Angular pour naviguer entre les vues |

### Structure générée

```
front/
├── src/
│   ├── app/
│   │   ├── app.ts            # Composant racine
│   │   ├── app.html           # Template du composant racine
│   │   ├── app.scss           # Styles du composant racine
│   │   ├── app.config.ts      # Configuration de l'application
│   │   └── app.routes.ts      # Définition des routes
│   ├── main.ts                # Point d'entrée de l'application
│   ├── index.html             # Page HTML hôte
│   └── styles.scss            # Styles globaux
├── angular.json               # Configuration Angular CLI
├── tsconfig.json              # Configuration TypeScript
└── package.json               # Dépendances npm
```

### Concepts clés Angular

- **Composant** — brique de base de l'UI. Chaque composant a un template (HTML), un style (SCSS) et une logique (TypeScript)
- **Service** — classe injectable qui contient la logique métier, partageable entre composants
- **Module vs Standalone** — Angular 21 utilise des composants **standalone** par défaut (pas besoin de NgModules)
- **Injection de dépendances** — Angular instancie et injecte les services automatiquement via le constructeur ou `inject()`

### Services Angular dans Moody

L'app est découpée en **services spécialisés**, chacun responsable d'une seule feature :

| Service | Responsabilité |
|---|---|
| `CanvasService` | Initialise le Stage/Layer Konva, gère le groupe d'images et la bounding box |
| `ZoomService` | Zoom molette centré sur le curseur |
| `PanService` | Déplacement du canvas au clic molette |
| `DropService` | Drag & drop de fichiers images depuis l'OS |
| `SelectionService` | Sélection clic, Ctrl+clic, lasso (box select) + Transformer |
| `SaveService` | Sauvegarde au format `.moody` (ZIP avec images embarquées) |
| `OpenService` | Ouverture d'un fichier `.moody` (dézip, migration, reconstruction canvas) |
| `FrameService` | Création, redimensionnement, attachement d'images aux frames |
| `ContextMenuService` | Gestion de l'affichage et du contenu des menus clic droit |
| `KeyBindingService` | Registre centralisé des raccourcis clavier et souris, reconfigurables |
| `ApiService` | Communication HTTP avec le backend Spring Boot (offline-first) |

Le composant `App` orchestre tout : il initialise les services dans `ngAfterViewInit()` et branche les événements souris/clavier.

### Lifecycle hooks

Angular appelle automatiquement certaines méthodes à des moments précis de la vie d'un composant :

- `ngAfterViewInit()` — appelé quand le template HTML est rendu dans le DOM. Indispensable quand on doit accéder à un élément du DOM (ex: attacher Konva à un `<div>`)

Pour l'utiliser, la classe doit implémenter l'interface `AfterViewInit` :
```ts
export class App implements AfterViewInit {
  ngAfterViewInit(): void { /* le DOM est prêt */ }
}
```

### Template reference variables

Permet de marquer un élément HTML pour y accéder depuis le TypeScript :
```html
<div #canvasContainer></div>
```
```ts
@ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;
```
- `#canvasContainer` — la référence dans le template
- `@ViewChild(...)` — le décorateur qui récupère cette référence côté TypeScript
- `!` — dit à TypeScript que la propriété sera initialisée plus tard (par Angular)
- `ElementRef<HTMLDivElement>` — le type, qui wrape l'élément DOM natif. On accède au vrai élément via `.nativeElement`

---

## Electron

### Architecture : deux processus

Une app Electron a **deux processus** :
- **Main process** (`electron/main.js`) — Node.js pur. Crée les fenêtres, gère les fichiers, les menus. C'est le "chef d'orchestre"
- **Renderer process** — la page web (Angular). Chaque fenêtre = un renderer

### Le fichier `main.js`

Point d'entrée de l'app desktop. Responsabilités :
1. Importer `app` (cycle de vie) et `BrowserWindow` (création de fenêtre) depuis `electron`
2. Créer une fenêtre avec `new BrowserWindow({...})`
3. Charger le contenu (URL Angular en dev, fichiers buildés en prod)
4. Gérer la fermeture (`app.on('window-all-closed', ...)`)

### Options clés de `BrowserWindow`

| Option | Rôle |
|---|---|
| `width`, `height` | Taille initiale de la fenêtre |
| `frame: false` | Fenêtre frameless — pas de barre de titre native |
| `nodeIntegration: false` | Le renderer n'a pas accès aux APIs Node.js (sécurité) |
| `contextIsolation: true` | Isole le contexte JS du renderer |

### Communication Main ↔ Renderer (IPC)

Les deux processus Electron ne peuvent **pas** communiquer directement. Ils passent par **IPC** (Inter-Process Communication) :

1. **Main process** — enregistre un handler avec `ipcMain.handle('channel-name', callback)`
2. **Preload script** (`preload.js`) — expose une API sécurisée au renderer via `contextBridge.exposeInMainWorld()`
3. **Renderer** — appelle `window.electronAPI.maMethode()` qui déclenche `ipcRenderer.invoke('channel-name')`

```
Renderer  →  ipcRenderer.invoke('save-file', data)
                    ↓
Preload   →  contextBridge (pont sécurisé)
                    ↓
Main      →  ipcMain.handle('save-file', callback)  →  dialog, fs, etc.
```

Le preload est le **seul pont** entre les deux mondes. Le renderer n'a jamais accès direct à Node.js (sécurité).

**Pourquoi `invoke`/`handle` ?** — Pattern requête/réponse asynchrone. `invoke` retourne une `Promise`, ce qui permet d'attendre le résultat (ex: chemin du fichier choisi par l'utilisateur dans le dialog).

### Lancement

```bash
# Depuis front/ — lance Angular + Electron en une commande
npx concurrently "npm start" "npx wait-on http://localhost:4200 && npx electron ."
```

- `concurrently` — lance plusieurs commandes en parallèle dans le même terminal
- `wait-on` — attend que le serveur Angular soit prêt avant de lancer Electron
- Le `.` après `npx electron` est obligatoire — il dit à Electron "lance l'app dans le dossier courant". Electron cherche le `package.json` et son champ `"main"` pour trouver le point d'entrée

---

## Konva.js

### Hiérarchie

```
Stage → Layer → Shape/Image/Group
```
- **Stage** — conteneur racine, lié à un élément DOM. Crée le `<canvas>` HTML
- **Layer** — couche de dessin (comme un calque Photoshop). On peut en avoir plusieurs
- **Shape** — forme dessinable (`Rect`, `Circle`, `Image`, `Text`, etc.)

### Initialisation

```ts
import Konva from 'konva';

const stage = new Konva.Stage({
  container: monDiv,       // élément DOM
  width: window.innerWidth,
  height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);
```

### Zoom centré sur le curseur

Le zoom se fait via `stage.scale()`. Pour centrer sur le curseur :

1. Récupérer la position du curseur sur l'écran (`stage.getPointerPosition()`)
2. Convertir en coordonnées "monde" : `(pointEcran - stage.position()) / scale`
3. Appliquer le nouveau scale
4. Repositionner le stage : `pointEcran - pointMonde * newScale`

### Pan (déplacement du canvas)

Écouter `mousemove` sur le stage et déplacer via `stage.position()`.
`e.evt.movementX` / `movementY` donne le delta de mouvement de la souris depuis le dernier événement — on l'ajoute directement à la position courante.

### Drag & drop de fichiers

Le drop depuis l'explorateur est un événement **DOM natif**, pas Konva. On écoute sur `stage.container()` :
- `dragover` → `preventDefault()` pour autoriser le drop
- `drop` → `preventDefault()` pour empêcher l'ouverture native du fichier

Chaîne de chargement d'une image :
```
File → FileReader.readAsDataURL() → Image() HTML → Konva.Image
```

### Restreindre le drag à un bouton

```ts
konvaImage.on('dragstart', (e) => {
  if (e.evt.button !== 0) konvaImage.stopDrag();
});
```

---

## Frames

### Concept

Les frames sont des **zones de regroupement visuel** (comme les artboards de Figma ou les cadres de Miro). Elles permettent d'organiser les images par thème ou catégorie sur le canvas.

Une frame est composée de :
- Un **fond** (`Konva.Rect`) — rectangle semi-transparent avec bordure
- Un **titre** (`Konva.Text`) — affiché au-dessus, dans un overlay séparé
- Des **enfants** — images attachées qui bougent avec la frame

### Architecture Konva

```
Layer
├── Konva.Group (frame 1)         ← le conteneur
│   └── Konva.Rect (frame-bg)    ← fond visuel
├── Konva.Group (frame 2)
│   └── Konva.Rect (frame-bg)
├── Konva.Image (image libre)
├── Konva.Image (attachée à frame 1)
└── Group "titles-overlay"        ← toujours au-dessus de tout
    ├── Konva.Text (titre frame 1)
    └── Konva.Text (titre frame 2)
```

**Pourquoi un overlay séparé pour les titres ?** Les images droppées sur le canvas sont ajoutées **après** les frames dans le Layer. Elles apparaissent donc au-dessus des frames (z-order Konva = ordre d'ajout). Sans overlay, les titres seraient cachés derrière les images. Le groupe `titles-overlay` est ajouté en dernier au Layer, ce qui garantit que les titres restent visibles.

### Attachement des images

Quand une image est déplacée, `FrameService.updateImageAttachment()` vérifie si le **centre de l'image** est à l'intérieur d'une frame (collision par bounding box) :
- **Oui** → l'image est rattachée à cette frame. Si la frame est déplacée, l'image suit
- **Non** → l'image est détachée et redevient libre

```ts
// Pseudo-logique d'attachement
const imageCenter = { x: image.x() + image.width()/2, y: image.y() + image.height()/2 };
if (isInsideFrame(imageCenter, frame)) {
  attachToFrame(image, frame);
}
```

### Déplacement de la frame

Quand une frame est draggée, tous ses enfants suivent :

```ts
group.on('dragmove', () => {
  const dx = newX - lastX;
  const dy = newY - lastY;
  children.forEach(child => {
    child.x(child.x() + dx);
    child.y(child.y() + dy);
  });
});
```

### Redimensionnement

Le service détecte si la souris est près d'un bord ou d'un coin de frame (zone de seuil configurable). 8 poignées possibles : 4 coins + 4 bords.

Le seuil de détection s'adapte au zoom : `threshold / stage.scaleX()`. Ainsi, la zone de clic reste constante à l'écran quel que soit le niveau de zoom.

Le curseur change selon la poignée survolée : `ns-resize`, `ew-resize`, `nwse-resize`, etc.

### Titre : scale inversé

**Problème** : quand on dézoome beaucoup, les titres deviennent illisibles. Quand on zoome, ils deviennent énormes.

**Solution** : le titre est toujours mis à l'échelle **inverse** du zoom :

```ts
const inverseScale = 1 / stage.scaleX();
title.scale({ x: inverseScale, y: inverseScale });
```

Le titre reste à taille constante à l'écran, quel que soit le zoom. `updateTitleScales()` recalcule tous les titres à chaque changement de zoom.

### Édition du titre

Double-clic (ou action "Rename") → un champ `<input>` HTML est superposé sur le titre Konva. À la validation (Enter ou blur), le texte Konva est mis à jour et l'input est retiré du DOM.

### Configuration (`canvas.json`)

```json
"frame": {
  "defaultWidth": 400,
  "defaultHeight": 300,
  "bgColor": "#2a2a2a",
  "bgOpacity": 0.6,
  "borderColor": "#555555",
  "borderWidth": 1,
  "cornerRadius": 4,
  "titleFontSize": 16,
  "titleColor": "#cccccc",
  "edgeThreshold": 6,
  "contentPadding": 15,
  "minWidth": 100,
  "minHeight": 60
}
```

---

## Menu contextuel

### Principe

Le clic droit ouvre un menu contextuel dont le contenu dépend de ce qui est sous le curseur.

### Architecture

`ContextMenuService` est un **simple gestionnaire d'état** — il stocke la position, la visibilité et les items du menu. Toute la logique métier (save, delete, etc.) reste dans les services respectifs.

```ts
// L'API du service
contextMenu.open(x, y, items);   // Affiche le menu
contextMenu.close();             // Ferme le menu
```

### Types de menus

Le composant `App` construit un menu différent selon le contexte :

| Contexte | Détection | Actions disponibles |
|---|---|---|
| **Canvas** (zone vide) | Aucun node sous le curseur | Save, Open, Add Frame, Reset Zoom, Focus All, Keybindings, Status serveur, Close |
| **Image** | `Konva.Image` sous le curseur | Duplicate, Delete |
| **Frame** | Node avec nom `frame-bg` | Rename, Delete Frame, Delete Frame + Content |

### Détection du contexte

```ts
stage.on('contextmenu', (e) => {
  const target = stage.getIntersection(pointerPos);  // quel node Konva est sous la souris ?

  if (!target) {
    // Zone vide → menu canvas
  } else if (target instanceof Konva.Image) {
    // Image → menu image
  } else if (target.name() === 'frame-bg') {
    // Fond de frame → menu frame
  }
});
```

### Structure d'un item

```ts
interface MenuItem {
  type: 'action' | 'separator';
  label?: string;         // Texte affiché (uniquement pour 'action')
  action?: () => void;    // Callback au clic
}
```

Les séparateurs (`type: 'separator'`) créent une ligne de séparation visuelle entre les groupes d'actions.

### Positionnement

Le menu est repositionné si son affichage dépasse les bords de la fenêtre (overflow detection).

---

## Raccourcis reconfigurables

### Principe

**Tous** les raccourcis clavier et boutons souris sont définis dans un fichier JSON et peuvent être modifiés par l'utilisateur à l'exécution.

### Fichier `keybindings.json`

```json
{
  "actions": {
    "save":        { "label": "Save",         "shortcut": "ctrl+s" },
    "open":        { "label": "Open",         "shortcut": "ctrl+o" },
    "newFrame":    { "label": "New Frame",    "shortcut": "ctrl+f" },
    "focusAll":    { "label": "Focus All",    "shortcut": "f" },
    "deleteImage": { "label": "Delete Image", "shortcut": "delete" },
    "resetZoom":   { "label": "Reset Zoom",   "shortcut": "" }
  },
  "mouse": {
    "dragImage": { "label": "Drag / Select",  "button": 0 },
    "panView":   { "label": "Pan View",       "button": 1 },
    "menuOpen":  { "label": "Context Menu",   "button": 2 }
  }
}
```

- `shortcut` — combinaison de touches : `"ctrl+s"`, `"shift+delete"`, `"f"` (touche seule), `""` (pas de raccourci)
- `button` — code du bouton souris : `0` = gauche, `1` = molette, `2` = droit

### KeyBindingService — Architecture

Le service maintient trois maps :

| Map | Contenu |
|---|---|
| `bindings` | Raccourcis clavier parsés (ctrl/shift/alt + touche) |
| `mouseBindings` | Boutons souris par action |
| `handlers` | Callbacks enregistrés par le composant App |

### Cycle de vie

```
1. Chargement du JSON → parsing des raccourcis en objets structurés
2. App.ngAfterViewInit() → keybinding.register('save', () => saveService.save())
3. keybinding.listen() → attache un listener global sur 'keydown'
4. Utilisateur appuie sur Ctrl+S → le listener matche → exécute le handler
```

### Matching des raccourcis

```ts
private matches(e: KeyboardEvent, binding: ParsedBinding): boolean {
  return (
    e.key.toLowerCase() === binding.key &&
    e.ctrlKey === binding.ctrl &&
    e.shiftKey === binding.shift &&
    e.altKey === binding.alt
  );
}
```

Le listener ignore les événements quand :
- L'utilisateur est en train de taper dans un `<input>` ou `<textarea>` (édition de titre, par ex.)
- Le mode capture est actif (l'utilisateur est en train de reconfigurer un raccourci)

### Reconfiguration à l'exécution

1. L'utilisateur ouvre le panneau keybindings (via le menu contextuel)
2. Il clique "Capture" sur l'action à modifier
3. `capturing = true` → le dispatch est désactivé
4. Le prochain `keydown` (ou `mousedown` pour les boutons souris) est capturé
5. `updateShortcut(action, event)` parse et stocke le nouveau raccourci
6. Le label est mis à jour dans l'UI

### Boutons souris configurables

Le composant App utilise `getMouseButton()` pour savoir quel bouton déclenche quelle action :

```ts
stage.on('mousedown', (e) => {
  if (e.evt.button === keybinding.getMouseButton('dragImage')) {
    // Sélection / lasso
  } else if (e.evt.button === keybinding.getMouseButton('panView')) {
    // Pan
  }
});
```

Cela permet à l'utilisateur de remapper le pan sur le clic gauche et la sélection sur le clic droit, par exemple.

---

## Connexion front/back

### Principe : offline-first

L'app fonctionne **à 100% sans serveur** (save/open local en `.moody`). Le backend est optionnel et ajoute : partage LAN, API scriptable, collaboration.

### ApiService

Le service gère deux modes :

| Mode | `connected` | Fonctionnalités |
|---|---|---|
| **Offline** (défaut) | `false` | Canvas, save/open local, tout fonctionne |
| **Connecté** | `true` | + boards partagés, sessions, API REST |

### Connexion au serveur

Au démarrage, l'app tente de joindre le serveur :

```ts
// Dans ngAfterViewInit()
this.apiService.tryConnect().then(connected => {
  if (connected) console.log('[Moody] Connected to server');
  else console.log('[Moody] No server found — offline mode');
});
```

`tryConnect()` envoie un `GET /actuator/health` au serveur. Si la réponse contient `{ status: "UP" }`, le mode connecté est activé.

### Configuration (`app.json`)

```json
"api": {
  "defaultUrl": "http://localhost:8080",
  "healthEndpoint": "/actuator/health",
  "heartbeatIntervalMs": 10000
}
```

### Système de sessions

En mode connecté, quand un client ouvre une board partagée :

```
Client                          Serveur
│                                │
├─ POST /api/sessions            │
│  { boardId, clientName }  ────>│  Crée une session, génère un token UUID
│                           <────│  { token, otherClients: ["Alice"] }
│                                │
│  (si otherClients non vide     │
│   → avertir l'utilisateur)     │
│                                │
├─ PUT /sessions/{token}/heartbeat  (toutes les 10s)
│                           ────>│  Met à jour lastHeartbeat
│                                │
├─ DELETE /sessions/{token}      │
│  (à la fermeture)         ────>│  Supprime la session
```

- **Heartbeat** : le client ping le serveur toutes les 10 secondes pour signaler qu'il est toujours actif
- **Cleanup** : le serveur supprime les sessions sans heartbeat depuis 30+ secondes (tâche planifiée)
- **Pas d'authentification** : on est sur un LAN de confiance, un simple token UUID suffit

### RxJS et `firstValueFrom()`

Angular utilise `HttpClient` qui retourne des **Observables** (RxJS). Pour les appels HTTP ponctuels (requête → réponse), on convertit en Promise :

```ts
const response = await firstValueFrom(
  this.http.get<{ status: string }>(`${this.serverUrl}/actuator/health`)
);
```

**Pourquoi ?** Les Observables sont puissants pour les flux de données continus (WebSocket, events), mais verbeux pour un simple appel HTTP. `firstValueFrom()` attend la première valeur, se désabonne, et retourne une Promise — plus naturel avec `async/await`.

### Indicateur dans le menu contextuel

Le menu contextuel du canvas affiche l'état de connexion :
- `● Server connected` → clic pour se déconnecter
- `○ Offline mode` → clic pour tenter une reconnexion

---

## JavaScript — concepts clés

### Arrow functions

Syntaxe raccourcie pour les fonctions :
```js
// Classique
function add(a, b) { return a + b; }

// Arrow function
const add = (a, b) => a + b;
```

### Callbacks

Fonction passée en argument à une autre fonction, exécutée plus tard (souvent en réponse à un événement) :
```js
app.whenReady().then(createWindow);  // createWindow sera appelée quand l'app est prête
```
Attention : `then(createWindow)` passe la référence, `then(createWindow())` exécute immédiatement et passe le résultat.

### Closures

Fonction qui capture des variables de son scope parent :
```js
const scale = 1.05;
stage.on('wheel', () => {
  // cette arrow function "capture" scale — c'est une closure
  console.log(scale);
});
```

### Optional chaining (`?.`)

Accède à une propriété sans planter si la valeur est `undefined` :
```ts
const files = e.dataTransfer?.files;  // undefined si dataTransfer est null/undefined
```

---

## Format `.moody` — Sauvegarde et ouverture

### Principe

Un fichier `.moody` est une archive **ZIP renommée**. Dedans :

```
monboard.moody  (= ZIP)
├── board.json          # état du canvas + métadonnées des images
└── images/
    ├── img_0.png       # images embarquées (données brutes)
    └── img_1.jpeg
```

### Sauvegarde (SaveService)

1. Parcourir tous les `Konva.Image` du canvas
2. Pour chaque image : extraire le base64 depuis le `HTMLImageElement.src`, l'écrire dans `images/` du ZIP
3. Construire `board.json` avec les positions, scales, rotations et les références vers les fichiers images
4. Générer le ZIP avec `JSZip` et l'envoyer au main process via IPC pour écriture sur disque

### Ouverture (OpenService)

1. Le main process ouvre un dialog de sélection de fichier et retourne le buffer
2. `JSZip.loadAsync()` dézippe en mémoire
3. `board.json` est parsé puis passé dans `migrateBoard()` (système de migration)
4. Le canvas existant est vidé
5. Le stage est repositionné (x, y, scale)
6. Chaque image est rechargée depuis le ZIP : blob → dataURL → `Image()` HTML → `Konva.Image`

### Système de migration

Problème : si le format de `board.json` évolue (nouveaux champs, renommages), les anciens fichiers deviennent incompatibles.

Solution : un **pipeline de migrations versionnées** dans `migrations.ts` :

```
board.json v1.0  →  migration 1.0→1.1  →  migration 1.1→1.2  →  board.json v1.2 (courant)
```

Chaque migration est une fonction pure `{ from, to, migrate }` :
- `from` — version source
- `to` — version cible
- `migrate(data)` — transforme le JSON et met à jour `data.version`

Les migrations s'appliquent en chaîne. Un fichier v1.0 ouvert dans une app v1.5 passera par toutes les migrations intermédiaires.

**Règle d'or** : on ne modifie jamais une migration existante, on en ajoute une nouvelle.

### JSZip

Librairie JS pour créer/lire des archives ZIP en mémoire (pas d'accès fichier nécessaire) :

```ts
// Écriture
const zip = new JSZip();
zip.file('board.json', jsonString);
zip.folder('images')!.file('img_0.png', base64Data, { base64: true });
const data = await zip.generateAsync({ type: 'uint8array' });

// Lecture
const zip = await JSZip.loadAsync(buffer);
const content = await zip.file('board.json')!.async('string');
const blob = await zip.file('images/img_0.png')!.async('blob');
```

---

## Générer un `.moody` en Python

### Principe

Le format `.moody` est un **ZIP standard** — n'importe quel langage capable de créer un ZIP peut générer un board. Pas besoin du backend ni d'Electron : un script Python peut produire un fichier `.moody` prêt à l'emploi.

L'utilisateur n'a plus qu'à l'ouvrir dans Moody (Ctrl+O).

### Format attendu

```
monboard.moody  (= ZIP)
├── board.json
└── images/
    ├── img_0.jpg
    └── img_1.png
```

### Structure de `board.json` (version 1.1)

```json
{
  "version": "1.1",
  "canvas": {
    "x": 0,
    "y": 0,
    "scale": 1.0
  },
  "images": [
    {
      "id": "img_0",
      "file": "images/img_0.jpg",
      "x": 100,
      "y": 200,
      "width": 800,
      "height": 600,
      "scaleX": 1.0,
      "scaleY": 1.0,
      "rotation": 0
    }
  ],
  "frames": [
    {
      "id": "frame_0",
      "title": "Références",
      "x": 50,
      "y": 150,
      "width": 900,
      "height": 700,
      "children": ["img_0"]
    }
  ]
}
```

### Champs obligatoires

#### `canvas`

| Champ | Type | Description |
|---|---|---|
| `x` | number | Position horizontale du viewport |
| `y` | number | Position verticale du viewport |
| `scale` | number | Niveau de zoom (1.0 = 100%) |

#### `images[]`

| Champ | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique (doit correspondre au nom dans `children` des frames) |
| `file` | string | Chemin dans le ZIP (ex: `"images/img_0.jpg"`) |
| `x`, `y` | number | Position sur le canvas (coordonnées monde) |
| `width`, `height` | number | Dimensions originales de l'image en pixels |
| `scaleX`, `scaleY` | number | Échelle (1.0 = taille originale) |
| `rotation` | number | Rotation en degrés |

#### `frames[]` (optionnel)

| Champ | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique |
| `title` | string | Titre affiché sur la frame |
| `x`, `y` | number | Position de la frame |
| `width`, `height` | number | Dimensions de la frame |
| `children` | string[] | Liste d'IDs d'images contenues dans la frame |

### Exemple Python complet

```python
import zipfile
import json
import os
from PIL import Image  # pip install Pillow

def create_moody(output_path, image_paths, title="Generated Board"):
    """
    Generate a .moody file from a list of image paths.
    Images are laid out in a grid, grouped in a single frame.
    """
    board_images = []
    frame_children = []

    # Grid layout: 3 columns, spaced by 50px
    cols = 3
    padding = 50
    cursor_x = 100
    cursor_y = 100
    row_height = 0

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for i, path in enumerate(image_paths):
            img_id = f"img_{i}"
            ext = os.path.splitext(path)[1].lstrip('.') or 'png'
            zip_path = f"images/{img_id}.{ext}"

            # Embed the image file into the ZIP
            zf.write(path, zip_path)

            # Get real dimensions with Pillow
            with Image.open(path) as img:
                w, h = img.size

            # Grid position
            col = i % cols
            if col == 0 and i > 0:
                cursor_y += row_height + padding
                row_height = 0
            cursor_x = 100 + col * (400 + padding)
            row_height = max(row_height, h * (400 / w))  # normalized height

            display_width = 400
            scale = display_width / w

            board_images.append({
                "id": img_id,
                "file": zip_path,
                "x": cursor_x,
                "y": cursor_y,
                "width": w,
                "height": h,
                "scaleX": scale,
                "scaleY": scale,
                "rotation": 0,
            })
            frame_children.append(img_id)

        board = {
            "version": "1.1",
            "canvas": {"x": 0, "y": 0, "scale": 1.0},
            "images": board_images,
            "frames": [{
                "id": "frame_0",
                "title": title,
                "x": 50,
                "y": 50,
                "width": cols * (400 + padding) + 100,
                "height": cursor_y + row_height + 100,
                "children": frame_children,
            }],
        }

        zf.writestr("board.json", json.dumps(board, indent=2))

    print(f"Created {output_path} with {len(image_paths)} images")


# Usage
create_moody(
    "references.moody",
    ["photo1.jpg", "photo2.png", "concept_art.jpg"],
    title="Visual References"
)
```

### Exemple minimal (sans Pillow)

Si les dimensions des images sont connues à l'avance :

```python
import zipfile, json

with zipfile.ZipFile("simple.moody", "w") as zf:
    # Embed one image
    zf.write("my_image.jpg", "images/img_0.jpg")

    # Write board.json
    board = {
        "version": "1.1",
        "canvas": {"x": 0, "y": 0, "scale": 1.0},
        "images": [{
            "id": "img_0",
            "file": "images/img_0.jpg",
            "x": 0, "y": 0,
            "width": 1920, "height": 1080,
            "scaleX": 0.5, "scaleY": 0.5,
            "rotation": 0,
        }],
        "frames": [],
    }
    zf.writestr("board.json", json.dumps(board, indent=2))
```

### Pièges à éviter

| Piège | Solution |
|---|---|
| `width`/`height` à 0 | L'image sera invisible — toujours mettre les vraies dimensions en pixels |
| `id` en doublon | Chaque image et frame doit avoir un ID unique |
| `file` ne matche pas le ZIP | Le chemin dans `board.json` doit correspondre exactement au chemin dans l'archive |
| `version` manquant | Mettre `"1.1"` — sans ça le système de migration ne peut pas fonctionner |
| `children` avec des IDs inexistants | Les IDs dans `children` doivent correspondre à des `id` dans `images` |

---

## Spring Boot

### Qu'est-ce que Spring Boot ?

Spring Boot est un framework Java qui simplifie la création d'applications web. Il fournit :
- Un serveur HTTP embarqué (pas besoin de Tomcat externe)
- L'auto-configuration (détecte les dépendances et configure automatiquement)
- L'injection de dépendances (comme Angular — les services sont créés et injectés par le framework)

### Structure du projet

```
back/src/main/java/com/moody/
├── MoodyApplication.java          # Point d'entrée
├── config/
│   └── CorsConfig.java            # Configuration CORS
├── board/                          # Domaine Board
│   ├── Board.java                  # Entity (modèle BDD)
│   ├── BoardDto.java               # DTO de réponse
│   ├── CreateBoardRequest.java     # DTO de requête (création)
│   ├── UpdateBoardRequest.java     # DTO de requête (modification)
│   ├── BoardController.java        # Endpoints REST
│   ├── BoardService.java           # Logique métier
│   ├── BoardRepository.java        # Accès données (JPA)
│   ├── BoardNotFoundException.java # Exception custom
│   └── BoardExceptionHandler.java  # Gestion d'erreurs
├── session/                        # Domaine Session (même structure)
├── image/                          # Domaine Image (même structure)
└── frame/                          # Domaine Frame (même structure)
```

Chaque domaine suit la même architecture en couches : **Controller → Service → Repository → Entity**.

### Point d'entrée

```java
@SpringBootApplication
@EnableScheduling
public class MoodyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MoodyApplication.class, args);
    }
}
```

- `@SpringBootApplication` — combine 3 annotations : `@Configuration` (peut définir des beans), `@EnableAutoConfiguration` (config auto), `@ComponentScan` (scanne `com.moody.*` pour trouver les `@Service`, `@Controller`, etc.)
- `@EnableScheduling` — active les méthodes `@Scheduled` (utilisé pour le nettoyage automatique des sessions mortes)

### Architecture en couches

```
Client HTTP
    ↓
Controller      @RestController — reçoit les requêtes, valide, délègue
    ↓
Service         @Service — logique métier, transactions
    ↓
Repository      interface JpaRepository — requêtes SQL auto-générées
    ↓
Entity          @Entity — mapping objet ↔ table PostgreSQL
```

### Entities (modèles BDD)

Une entity est une classe Java mappée sur une table PostgreSQL via des annotations JPA :

```java
@Entity
@Table(name = "boards")
public class Board {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;              // Clé primaire, UUID auto-généré

    @Column(nullable = false)
    private String title;

    @Column(name = "file_path", nullable = false, unique = true)
    private String filePath;      // Chemin vers le .moody sur le réseau

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist                   // Appelé avant le premier INSERT
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate                    // Appelé avant chaque UPDATE
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
```

| Annotation | Rôle |
|---|---|
| `@Entity` | Dit à JPA que cette classe représente une table |
| `@Table(name = "...")` | Nom de la table en BDD |
| `@Id` | Clé primaire |
| `@GeneratedValue(strategy = UUID)` | UUID généré automatiquement par JPA |
| `@Column(nullable, unique, updatable)` | Contraintes sur la colonne |
| `@PrePersist` / `@PreUpdate` | Hooks du cycle de vie JPA (comme `ngAfterViewInit` en Angular) |
| `@ManyToOne` | Relation N→1 (ex: une image appartient à un board) |

#### Les 4 entities du projet

| Entity | Table | Rôle |
|---|---|---|
| `Board` | `boards` | Métadonnées d'un board (titre, chemin fichier) |
| `Session` | `sessions` | Session active d'un client sur un board (token, heartbeat) |
| `BoardImage` | `board_images` | Image sur un board (chemin réseau, position, scale, rotation) |
| `BoardFrame` | `board_frames` | Frame sur un board (titre, position, dimensions, enfants) |

**Relations :**
```
Board 1──N Session      (un board peut avoir plusieurs sessions actives)
Board 1──N BoardImage   (un board contient plusieurs images)
Board 1──N BoardFrame   (un board contient plusieurs frames)
BoardFrame N──N Image   (une frame référence des images via une liste d'IDs)
```

### DTOs (Data Transfer Objects)

Les DTOs contrôlent ce qui est envoyé/reçu par l'API. On ne renvoie **jamais** l'entity brute au client.

**Pourquoi ?** Séparer le contrat d'API du schéma de base de données. Si on renomme une colonne, le client ne casse pas.

Spring Boot utilise les **records** Java (Java 16+) — classes immutables avec constructeur, getters, equals et toString auto-générés :

```java
// DTO de réponse — ce que le client reçoit
public record BoardDto(
    UUID id, String title, String filePath,
    Instant createdAt, Instant updatedAt
) {
    public static BoardDto from(Board board) {
        return new BoardDto(board.getId(), board.getTitle(), ...);
    }
}

// DTO de requête — ce que le client envoie
public record CreateBoardRequest(
    @NotBlank String title,       // Validation : non null, non vide
    @NotBlank String filePath
) {}
```

### Repositories (accès données)

Spring Data JPA génère automatiquement l'implémentation SQL à partir du **nom des méthodes** :

```java
public interface BoardRepository extends JpaRepository<Board, UUID> {
    boolean existsByFilePath(String filePath);
    // → SELECT COUNT(*) > 0 FROM boards WHERE file_path = ?
}

public interface SessionRepository extends JpaRepository<Session, UUID> {
    Optional<Session> findByToken(UUID token);
    // → SELECT * FROM sessions WHERE token = ?

    List<Session> findByBoardIdAndLastHeartbeatAfter(UUID boardId, Instant cutoff);
    // → SELECT * FROM sessions WHERE board_id = ? AND last_heartbeat > ?

    void deleteByLastHeartbeatBefore(Instant cutoff);
    // → DELETE FROM sessions WHERE last_heartbeat < ?
}
```

**Pas besoin d'écrire de SQL.** Spring parse le nom de la méthode et génère la requête. Convention :
- `findBy` + nom du champ → `WHERE champ = ?`
- `And` / `Or` → combinaison de conditions
- `After` / `Before` → `>` / `<`
- `existsBy` → retourne `boolean`

Les méthodes CRUD de base (`findAll`, `findById`, `save`, `deleteById`, `existsById`) sont fournies par `JpaRepository` — rien à déclarer.

### Services (logique métier)

```java
@Service
public class BoardService {
    private final BoardRepository repository;

    // Injection par constructeur — Spring injecte automatiquement le repository
    public BoardService(BoardRepository repository) {
        this.repository = repository;
    }

    public Board create(CreateBoardRequest request) {
        if (repository.existsByFilePath(request.filePath())) {
            throw new IllegalArgumentException("A board with this file path already exists");
        }
        Board board = new Board();
        board.setTitle(request.title());
        board.setFilePath(request.filePath());
        return repository.save(board);  // INSERT + @PrePersist
    }

    public Board update(UUID id, UpdateBoardRequest request) {
        Board board = findById(id);
        if (request.title() != null) board.setTitle(request.title());
        if (request.filePath() != null) board.setFilePath(request.filePath());
        return repository.save(board);  // UPDATE + @PreUpdate
    }
}
```

**Pattern : null = ne pas modifier.** Les champs `null` dans un `UpdateRequest` sont ignorés. Le client n'envoie que ce qu'il veut changer.

`@Transactional` — annotation qui enveloppe la méthode dans une transaction BDD. Si une exception est levée, tout est rollback (annulé). Utilisée dans les services Session, Image et Frame pour les opérations de modification.

### Controllers (endpoints REST)

```java
@RestController                           // Retourne du JSON (pas du HTML)
@RequestMapping("/api/boards")            // Préfixe de toutes les routes
public class BoardController {
    private final BoardService service;

    public BoardController(BoardService service) {
        this.service = service;
    }

    @GetMapping                           // GET /api/boards
    public List<BoardDto> list() {
        return service.findAll().stream()
            .map(BoardDto::from)          // Convertit chaque entity en DTO
            .toList();
    }

    @PostMapping                          // POST /api/boards
    @ResponseStatus(HttpStatus.CREATED)   // Retourne 201 au lieu de 200
    public BoardDto create(@Valid @RequestBody CreateBoardRequest request) {
        return BoardDto.from(service.create(request));
    }

    @DeleteMapping("/{id}")               // DELETE /api/boards/{id}
    @ResponseStatus(HttpStatus.NO_CONTENT) // 204 — pas de body
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
```

| Annotation | Rôle |
|---|---|
| `@RestController` | Contrôleur REST (JSON automatique) |
| `@RequestMapping("/api/...")` | Préfixe URL |
| `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` | Méthode HTTP |
| `@PathVariable` | Extrait une valeur de l'URL (`/boards/{id}`) |
| `@RequestBody` | Désérialise le body JSON en objet Java |
| `@Valid` | Déclenche la validation des annotations (`@NotBlank`, `@NotNull`) |
| `@ResponseStatus` | Code HTTP de la réponse |

### Endpoints de l'API

#### Boards (`/api/boards`)

| Méthode | URL | Description | Status |
|---|---|---|---|
| GET | `/api/boards` | Lister tous les boards | 200 |
| GET | `/api/boards/{id}` | Récupérer un board | 200 |
| POST | `/api/boards` | Créer un board | 201 |
| PUT | `/api/boards/{id}` | Modifier un board | 200 |
| DELETE | `/api/boards/{id}` | Supprimer un board | 204 |

#### Sessions (`/api/sessions`)

| Méthode | URL | Description | Status |
|---|---|---|---|
| POST | `/api/sessions` | Ouvrir un board (obtenir un token) | 201 |
| PUT | `/api/sessions/{token}/heartbeat` | Signaler que le client est actif | 200 |
| DELETE | `/api/sessions/{token}` | Fermer la session | 204 |
| GET | `/api/sessions/board/{boardId}` | Sessions actives sur un board | 200 |

#### Images (`/api/boards/{boardId}/images`)

| Méthode | URL | Description | Status |
|---|---|---|---|
| GET | `/api/boards/{boardId}/images` | Lister les images d'un board | 200 |
| GET | `/api/boards/{boardId}/images/{imageId}` | Récupérer une image | 200 |
| POST | `/api/boards/{boardId}/images` | Ajouter une image (par chemin réseau) | 201 |
| PUT | `/api/boards/{boardId}/images/{imageId}` | Modifier position/scale/rotation | 200 |
| DELETE | `/api/boards/{boardId}/images/{imageId}` | Supprimer une image | 204 |

#### Frames (`/api/boards/{boardId}/frames`)

| Méthode | URL | Description | Status |
|---|---|---|---|
| GET | `/api/boards/{boardId}/frames` | Lister les frames d'un board | 200 |
| GET | `/api/boards/{boardId}/frames/{frameId}` | Récupérer une frame | 200 |
| POST | `/api/boards/{boardId}/frames` | Créer une frame | 201 |
| PUT | `/api/boards/{boardId}/frames/{frameId}` | Modifier une frame | 200 |
| DELETE | `/api/boards/{boardId}/frames/{frameId}` | Supprimer une frame | 204 |

### Système de sessions/tokens

Pas d'authentification utilisateur — on est sur un LAN de confiance. Le système de sessions détecte la **collaboration** (plusieurs clients sur le même board).

**Flux complet :**

```
1. Client → POST /api/sessions { boardId, clientName: "PC-Jeremy" }
2. Serveur → crée Session, génère token UUID
3. Serveur → vérifie les autres sessions actives sur ce board
4. Serveur → { token: "abc-123", otherClients: ["PC-Alice"] }
   └─ Si otherClients n'est pas vide → avertir l'utilisateur
5. Client → PUT /api/sessions/abc-123/heartbeat  (toutes les 10-30s)
6. Serveur → cleanup @Scheduled toutes les 60s : supprime sessions sans heartbeat > 30s
7. Client → DELETE /api/sessions/abc-123  (à la fermeture)
```

### Gestion d'erreurs

Chaque domaine a un `@RestControllerAdvice` qui intercepte les exceptions et retourne du JSON propre :

```java
@RestControllerAdvice
public class BoardExceptionHandler {

    @ExceptionHandler(BoardNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> handleNotFound(BoardNotFoundException ex) {
        return Map.of("error", ex.getMessage());
    }
}
```

Résultat côté client :
```json
{ "error": "Board not found: 550e8400-..." }   // 404
{ "error": "A board with this file path already exists" }  // 400
```

### CORS

```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");   // Toutes les origines
        config.addAllowedMethod("*");          // Toutes les méthodes HTTP
        config.addAllowedHeader("*");          // Tous les headers
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);  // Toutes les URLs
        return new CorsFilter(source);
    }
}
```

**Pourquoi CORS ?** Electron charge l'app depuis `file://` ou `localhost:4200` (dev). L'API est sur `localhost:8080` — **origine différente**. Sans CORS, le navigateur bloque les requêtes cross-origin. Sur un LAN de confiance, on autorise tout.

### Configuration (`application.yml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:moody}
    username: ${DB_USER:moody}
    password: ${DB_PASSWORD:moody}
  jpa:
    hibernate:
      ddl-auto: update           # Crée/modifie les tables automatiquement au démarrage
    show-sql: true               # Affiche les requêtes SQL dans les logs

server:
  port: 8080

springdoc:                       # Swagger UI
  swagger-ui:
    path: /swagger-ui            # Accessible à /swagger-ui/index.html

moody:
  session:
    timeout-seconds: 30          # Timeout session sans heartbeat
    cleanup-interval-ms: 60000   # Fréquence du nettoyage automatique
```

- `${DB_HOST:localhost}` — variable d'environnement avec valeur par défaut. En Docker, `DB_HOST=db` (nom du container). En local, `localhost`
- `ddl-auto: update` — Hibernate crée les tables manquantes et ajoute les colonnes manquantes au démarrage. Pratique en dev, à remplacer par Flyway/Liquibase en production
- `springdoc` — génère automatiquement la doc Swagger à partir des annotations `@Operation` sur les endpoints

### Swagger / OpenAPI

L'API est documentée automatiquement. Accessible à `http://localhost:8080/swagger-ui/index.html` quand le serveur tourne.

Permet de tester les endpoints directement dans le navigateur — utile pour le debug et pour les développeurs Python qui veulent scripter.

---

## Docker Compose

### Principe

Docker Compose orchestre plusieurs containers (services) définis dans un seul fichier `docker-compose.yml`.

### Configuration (`back/docker-compose.yml`)

```yaml
services:
  db:                                    # Container PostgreSQL
    image: postgres:17
    environment:
      POSTGRES_DB: moody
      POSTGRES_USER: moody
      POSTGRES_PASSWORD: moody
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data  # Données persistantes
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U moody"]
      interval: 5s

  api:                                   # Container Spring Boot
    build: .
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy       # Attend que PostgreSQL soit prêt
    environment:
      DB_HOST: db                        # "db" = nom du container PostgreSQL
      DB_PORT: 5432
      DB_NAME: moody
      DB_USER: moody
      DB_PASSWORD: moody
      SHARED_PATH: /data/shared
    volumes:
      - ./shared:/data/shared            # Simule le NAS partagé

volumes:
  pgdata:                                # Volume nommé pour persister les données
```

### Concepts clés

| Concept | Explication |
|---|---|
| **Container** | Instance isolée d'une image Docker (comme une mini-VM légère) |
| **Volume** (`pgdata`) | Stockage persistant — les données survivent au redémarrage du container |
| **depends_on + healthcheck** | `api` ne démarre que quand `db` répond à `pg_isready` (pas juste "container lancé") |
| **Réseau interne** | Les containers se voient par nom (`db`, `api`). `api` se connecte à PostgreSQL via `DB_HOST=db` |
| **Ports** | `"8080:8080"` = le port 8080 du container est accessible sur le port 8080 de la machine hôte |

### Commandes

```bash
# Depuis back/
docker-compose up -d     # Lance les containers en arrière-plan
docker-compose down      # Arrête et supprime les containers
docker-compose logs -f   # Suit les logs en temps réel
docker-compose up --build  # Rebuild l'image Spring Boot avant de lancer
```

### Pourquoi Docker Compose ?

- **Reproductible** — un seul `docker-compose up` installe et configure tout (PostgreSQL + Spring Boot)
- **Isolé** — pas besoin d'installer PostgreSQL sur la machine
- **Portable** — se déploie sur n'importe quel serveur du LAN avec Docker installé
- **Cohérent** — tout le monde utilise la même version de PostgreSQL, la même config
