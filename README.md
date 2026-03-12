# Moody

Application desktop de moodboard inspirée de [PureRef](https://www.pureref.com/) — manipulation d'images sur canvas infini, frames, sauvegarde locale et API ouverte.

> Projet en cours de développement

---

## Fonctionnalités

- Canvas infini avec zoom, pan, drag & drop d'images
- Sélection multiple (lasso + Ctrl+Click)
- Frames — zones groupées avec titre et commentaire (type Figma/Miro)
- Sauvegarde locale au format `.moody` (archive portable)
- Raccourcis clavier 100% reconfigurables
- Fenêtre frameless avec hotcorners/hotedges
- API REST documentée (Swagger) — consommable par des scripts Python
- Fonctionne offline — le backend est optionnel

---

## Stack

| Couche | Techno |
|---|---|
| Desktop | Electron |
| Frontend | Angular + Konva.js |
| Backend | Spring Boot (Java) |
| Base de données | PostgreSQL |
| Stockage images | AWS S3 / MinIO |

---

## Installation

> Documentation à venir

---

## Format de fichier `.moody`

Les boards sont sauvegardés dans un format `.moody` — une archive ZIP contenant un fichier `board.json` et les images embarquées. Le format est ouvert et documenté pour permettre une utilisation depuis des scripts Python ou d'autres outils.

---

## Licence

[MIT](LICENSE)
