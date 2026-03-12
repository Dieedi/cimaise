# MoodBoard App — Contexte Projet

## Vision
Application de moodboard desktop type PureRef, avec une expérience utilisateur fluide et native,
une sauvegarde locale et une API ouverte aux développeurs Python.

---

## Stack Technique

### Frontend / Desktop
- **Electron** — coquille desktop (accès fichiers natif, portabilité OS, comportement natif)
- **Angular** — structure et logique de l'application
- **Konva.js** — rendu canvas (zoom, pan, drag & drop des images)

### Backend
- **Spring Boot (Java)** — API REST
- **PostgreSQL** — base de données
- **AWS S3 ou MinIO** — stockage des images

---

## Architecture du Projet (Monorepo)

```
moodboard/
├── front/        # Electron + Angular + Konva.js
├── back/         # Spring Boot
└── CLAUDE.md
```

---

## Fonctionnalités Clés

- Manipulation d'images sur canvas (zoom infini, pan, drag & drop)
- **Sélection multiple** — sélection par lasso (drag sur zone vide) et Ctrl+Click pour sélectionner/déplacer plusieurs images ensemble
- **Frames** — zones englobantes avec titre et commentaire, permettant de regrouper visuellement des images (type Figma/Miro)
- **Offline first** — sauvegarde locale au format `.moody` (archive ZIP propriétaire)
- Sync avec le backend quand connexion disponible
- **API REST** consommable par des développeurs Python (documentée via Swagger/OpenAPI)
- Portabilité **Windows / macOS / Linux** via Electron Builder

---

## UX & Contrôles

### Fenêtre
- **Frameless** — aucune bordure ni barre de titre native OS
- **Hotcorners / Hotedges** — bords et coins de la fenêtre déclenchent des actions configurables (ex: coin haut-gauche = nouveau board, bord droit = panneau propriétés...)

### Contrôles par défaut
| Action | Contrôle par défaut |
|---|---|
| Pan (déplacer le canvas) | Clic molette (bouton du milieu) |
| Zoom | Molette scroll |
| Sélection / Lasso | Clic gauche |
| Menu global | Clic droit |

### Raccourcis & Reconfigurabilité
- **100% des actions accessibles par raccourcis clavier**
- **Tous les raccourcis et contrôles sont reconfigurables** par l'utilisateur (ex: remplacer clic gauche par la touche `E` pour la sélection)
- Profils de raccourcis sauvegardables et exportables
- Fichier de config local (JSON) pour la persistance des préférences

---

## Contraintes & Décisions

| Décision | Raison |
|---|---|
| Electron plutôt que web app | Accès fichiers natif, fluidité canvas, portabilité OS |
| Angular plutôt que React | Employabilité optimale dans les Bouches-du-Rhône (13) |
| Spring Boot plutôt que Node | Dominant dans les ESN locales (Sopra, Capgemini, Inetum...) |
| Konva.js pour le canvas | Spécialisé manipulation images, performant, bien documenté |
| Monorepo | Permet à Claude Code de faire le lien back/front en une session |
| Format `.moody` (ZIP) plutôt que SQLite/H2 | Un seul fichier portable, pas de BDD locale, lisible par l'API Python |

---

## Format de Fichier `.moody`

Archive ZIP renommée en `.moody`, structure interne :

```
monboard.moody  (= ZIP)
├── board.json          # transforms, positions, frames, métadonnées
├── keybindings.json    # config raccourcis du board (optionnel)
└── images/
    ├── abc123.jpg      # images embarquées (drag depuis explorateur/desktop)
    └── ...             # images web = URL uniquement dans board.json
```

Exemple `board.json` :
```json
{
  "version": "1.0",
  "canvas": { "x": 0, "y": 0, "scale": 1.0 },
  "images": [
    { "id": "abc123", "type": "embedded", "file": "images/abc123.jpg", "x": 120, "y": 340, "scale": 1.4, "rotation": 0 },
    { "id": "def456", "type": "url", "src": "https://...", "x": 500, "y": 200, "scale": 1.0, "rotation": 0 }
  ],
  "frames": [
    { "id": "frame1", "title": "Inspiration", "comment": "...", "x": 100, "y": 100, "width": 600, "height": 400, "children": ["abc123"] }
  ]
}
```

---

## Marché Cible
Développement orienté employabilité **Bouches-du-Rhône (13)** —
stack alignée avec les demandes des ESN et entreprises locales (Aix-en-Provence, Marseille, Vitrolles).

---

## Objectif pédagogique

L'utilisateur souhaite **apprendre correctement** les frameworks utilisés dans ce projet.
Privilégier les explications, justifier les choix d'implémentation, et introduire les concepts
au fur et à mesure (Angular, Electron, Konva.js, Spring Boot, PostgreSQL).

---

## Notes pour Claude Code
- Toujours maintenir la cohérence des contrats d'API entre `back/` et `front/`
- Les DTOs Spring Boot doivent être cohérents avec les modèles Angular
- L'app doit fonctionner offline — le backend est optionnel pour les fonctions de base
- Documenter tous les endpoints REST avec Swagger (springdoc-openapi)
- **Zoom infini** — implémenter via un système de coordonnées virtuelles (pas de limite min/max de scale). Konva supporte nativement le zoom infini via `stage.scale()`. Attention aux performances sur les très grands canvas (virtualisation des éléments hors viewport obligatoire)
- **Sélection multiple** — via `Konva.Transformer` sur plusieurs nodes. Lasso = détection de collision rectangulaire sur mousedown/mousemove. Ctrl+Click = ajout/retrait du node dans la sélection courante
- **Frames** — implémenter comme un `Konva.Group` avec un `Rect` de fond, un `Text` pour le titre, un `Text` pour le commentaire. Les images droppées à l'intérieur d'une frame doivent lui être attachées (coordonnées relatives)
- **Fenêtre frameless** — `frame: false` dans `BrowserWindow` Electron. Implémenter une zone de drag custom (`-webkit-app-region: drag`) pour permettre le déplacement de la fenêtre
- **Hotcorners/Hotedges** — détecter la position de la souris relative aux bords de la fenêtre via `mousemove` sur le canvas. Définir des zones de détection (ex: 10px) sur chaque bord et coin
- **Système de raccourcis reconfigurables** — stocker la map `action → raccourci` dans un fichier `keybindings.json` local. Utiliser un service Angular centralisé (KeyBindingService) qui intercepte tous les événements clavier et dispatche les actions correspondantes. Toutes les interactions souris/clavier passent par ce service
- **Format .moody** — lire/écrire via `jszip` (npm) côté Electron. À la sauvegarde : sérialiser le state Konva en `board.json`, copier les images embarquées, zipper le tout. À l'ouverture : dézipper en mémoire, charger `board.json`, reconstruire le canvas Konva. Les images URL sont rechargées depuis leur source distante
