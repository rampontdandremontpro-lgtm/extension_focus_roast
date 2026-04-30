# Focus Roast

Focus Roast est une extension web de productivité fun qui analyse les sites visités, mesure le temps passé par catégorie et affiche des messages humoristiques selon le comportement de navigation.

## Objectif

L’extension permet de classer automatiquement les sites visités en plusieurs catégories :

- Productif
- Distraction
- E-commerce
- Neutre

Elle affiche aussi :

- le site actuel
- la catégorie détectée
- la source de classification
- un timer pour la page actuelle
- un timer total
- des messages "roast"

## Stack technique

### Extension web

- JavaScript natif
- HTML
- CSS
- Manifest V3
- Chrome Extensions API

### Backend

- NestJS
- TypeScript
- TypeORM
- PostgreSQL

### Base de données

- PostgreSQL
- pgAdmin
- dbdiagram.io

## Architecture

```txt
focus-roast/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── classifier.js
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── backend/
│   └── src/
│
├── database/
│   ├── schema.dbml
│   ├── schema.sql
│   └── seed.sql
│
└── README.md