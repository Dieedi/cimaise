# Cimaise

Un outil de moodboard desktop open-source, pensé pour les créatifs qui veulent automatiser leurs workflows.

---

## Présentation

**Cimaise** est une application desktop de moodboard : un canvas infini où glisser-déposer des images, les organiser librement, zoomer, naviguer.

Ce qui le distingue : une **API REST scriptable**. Vous pouvez créer, modifier et exporter vos boards depuis un script Python. Idéal pour les studios, les DA et les développeurs créatifs qui veulent automatiser la création de planches d'inspiration, de références ou de présentations visuelles.

---

## Fonctionnalités

- Canvas infini avec zoom, pan et drag & drop
- Organisation par frames avec titres
- Sélection multiple (lasso + Ctrl+Click)
- Raccourcis clavier et souris 100% reconfigurables
- Format de fichier `.cim` portable (un seul fichier, zéro dépendance)
- Fonctionne offline, sans compte, sans cloud
- API REST pour scripter la création de boards
- Disponible sur **Windows, Linux et macOS**

---

## Pourquoi une API ?

La plupart des outils de moodboard sont des boîtes noires. Avec Cimaise, un script Python peut :

- Générer un board à partir d'un dossier d'images
- Organiser automatiquement des références par catégorie
- Exporter des boards pour un pipeline de production

C'est un outil pensé **par et pour des gens qui codent autant qu'ils créent**.

---

## Stack

| Couche | Techno |
|---|---|
| Desktop | Electron |
| Frontend | Angular + Konva.js |
| Backend | Spring Boot (Java) |
| Base de données | PostgreSQL |
| Déploiement | Docker Compose (LAN) |

---

## Télécharger

Les builds Windows, Linux et macOS sont disponibles sur la page [Releases](https://github.com/Dieedi/moody/releases).

---

## Format de fichier `.cim`

Les boards sont sauvegardés au format `.cim` — une archive ZIP contenant un fichier `board.json` et les images embarquées. Le format est ouvert et documenté pour permettre une utilisation depuis des scripts Python ou d'autres outils.

---

## Soutenir le projet

Cimaise est développé sur mon temps libre. Si le projet vous intéresse, vous pouvez le soutenir sur [Tipeee](https://en.tipeee.com/chez-jerem/).

---

## Licence

[MIT](LICENSE)
