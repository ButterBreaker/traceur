# Traceur

Transforme tes sorties Strava en stories Instagram (1080×1920).

## Fonctionnement
- `server.js` : petit serveur Node/Express qui gère la connexion Strava (OAuth) et garde le Client Secret côté serveur.
- `public/index.html` : l'appli (liste des sorties, génération de la story, partage/téléchargement).

## Variables d'environnement (à mettre sur Render, jamais dans le code)
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `SESSION_SECRET` (chaîne aléatoire)
- `NODE_ENV=production`

## Réglage Strava
Dans https://www.strava.com/settings/api, "Authorization Callback Domain" = le domaine Render (ex. `traceur.onrender.com`).
