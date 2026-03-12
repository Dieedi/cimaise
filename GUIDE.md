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

### Lancement

```bash
# Terminal 1 : Angular
npm start

# Terminal 2 : Electron (depuis front/)
npx electron .
```

Le `.` est obligatoire — il dit à Electron "lance l'app dans le dossier courant". Electron cherche le `package.json` et son champ `"main"` pour trouver le point d'entrée

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

## Spring Boot

*(à compléter lors du développement backend)*
