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
- **PostgreSQL** — base de données (métadonnées boards, sessions)
- **Filesystem / partage réseau** — stockage des images (chemins référencés, pas de copie)
- **Docker Compose** — déploiement serveur dédié

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
- **Mode connecté (LAN)** — détection automatique du serveur sur le réseau local, sync des boards partagées
- **API REST scriptable** — consommable par des développeurs Python pour automatiser la création/modification de boards (documentée via Swagger/OpenAPI)
- **Collaboration LAN** — système de tokens de session : avertissement si une board est déjà ouverte, choix de collaborer ou non
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
| Chemins réseau plutôt que copie d'images | Les images vivent sur le partage réseau du studio, le serveur ne stocke que les références |
| Docker Compose pour le backend | Déploiement simple sur un serveur dédié LAN, reproductible |
| Tokens de session plutôt qu'authentification | Pas de comptes utilisateurs, léger, adapté au réseau interne de confiance |
| LAN uniquement, pas de cloud | Sécurité des assets studio, pas de dépendance internet, latence minimale |

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

### Général
- Toujours maintenir la cohérence des contrats d'API entre `back/` et `front/`
- Les DTOs Spring Boot doivent être cohérents avec les modèles Angular
- L'app doit fonctionner **offline** — le backend est optionnel pour les fonctions de base (canvas, save/open local)
- Documenter tous les endpoints REST avec Swagger (springdoc-openapi)

### Frontend (Konva / Angular / Electron)
- **Zoom infini** — via `stage.scale()`, pas de limite min/max. Attention aux performances sur les très grands canvas (virtualisation des éléments hors viewport obligatoire)
- **Sélection multiple** — via `Konva.Transformer` sur plusieurs nodes. Lasso = détection de collision rectangulaire sur mousedown/mousemove. Ctrl+Click = ajout/retrait du node dans la sélection courante
- **Frames** — `Konva.Group` avec `Rect` de fond + `Text` titre (dans un overlay séparé pour le z-order). Les images droppées à l'intérieur sont attachées (coordonnées relatives)
- **Fenêtre frameless** — `frame: false` dans `BrowserWindow` Electron. Zone de drag custom (`-webkit-app-region: drag`)
- **Hotcorners/Hotedges** — détection position souris relative aux bords (zones de 10px)
- **Raccourcis reconfigurables** — `keybindings.json` + `KeyBindingService` centralisé qui intercepte clavier et souris
- **Format .moody** — lire/écrire via `jszip`. Sérialiser le state Konva en `board.json`, images embarquées dans le ZIP. À l'ouverture : dézipper en mémoire, reconstruire le canvas

### Backend (Spring Boot / Docker)
- **Docker Compose** — le backend se déploie via `docker-compose up` (Spring Boot + PostgreSQL). Un seul fichier `docker-compose.yml` à la racine de `back/`
- **Découverte LAN** — le serveur s'annonce sur le réseau local (mDNS ou broadcast UDP). Le client Electron scanne le LAN au démarrage et propose les serveurs disponibles. Possibilité de forcer le mode local (sans serveur)
- **Tokens de session** — pas d'authentification utilisateur. Quand un client ouvre une board, il obtient un token de session. Si un autre client ouvre la même board, le serveur avertit les deux et propose la collaboration ou le mode lecture seule
- **Chemins réseau** — en mode connecté, les images sont référencées par leur chemin réseau (ex: `\\serveur\partage\images\photo.jpg` ou `/mnt/studio/images/photo.jpg`). Le serveur ne stocke jamais les fichiers images, seulement les métadonnées et les chemins
- **PostgreSQL** — stocke les métadonnées des boards (titre, participants, date de modification), les sessions actives, et les chemins vers les fichiers `.moody` sur le réseau
- **API scriptable** — endpoints REST pensés pour être consommés par des scripts Python : créer une board, ajouter des images par chemin, modifier des frames, exporter. Documenter chaque endpoint avec des exemples curl/Python
- **Mode hybride** — le front fonctionne sans backend (save/open local en `.moody`). Le backend ajoute : partage LAN, API scriptable, historique, collaboration temps réel (évolution future)
