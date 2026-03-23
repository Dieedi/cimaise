# Guide Technique — Moody

Guide d'apprentissage progressif des frameworks utilisés dans le projet Moody.
Mis à jour au fil du développement.

---

## Table des matières

- [Angular](#angular)
- [Electron](#electron)
- [Konva.js](#konvajs)
- [JavaScript — concepts clés](#javascript--concepts-clés)
- [Spring Boot](#spring-boot) *(à venir)*

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

## Spring Boot

*(à compléter lors du développement backend)*
