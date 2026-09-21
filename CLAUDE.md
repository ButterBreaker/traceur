# Traceur — contexte projet

Appli web qui transforme les sorties Strava en stories Instagram (1080×1920).
Projet perso de Mazéo (19 ans, La Bresse, Vosges). **Il n'est pas développeur** :
parle-lui en français, simplement, sans jargon, avec des étapes concrètes. Réponses courtes et directes.

## En ligne
- Site : https://traceur.onrender.com
- Hébergement : Render, service web `traceur` (plan gratuit, région Frankfurt, se met en veille après 15 min d'inactivité).
- Dépôt : https://github.com/ButterBreaker/traceur (branche `main`).
- Render : build `cd traceur-server && npm ci`, start `cd traceur-server && node server.js`.

## Structure
- `traceur-server/server.js` — Node/Express. Connexion Strava OAuth (`/auth/strava`, `/auth/callback`, `/auth/logout`), session en cookie signé (`cookie-session`, 30 jours), rafraîchissement auto du token, API `/api/me` et `/api/activities` (10 dernières sorties avec GPS, tracé en `summary_polyline`).
- `traceur-server/public/index.html` — tout le front en un seul fichier (HTML + CSS + JS vanilla, aucune lib) :
  - écran de chargement → page de connexion (bouton Strava + « Voir un exemple sans compte ») → liste des sorties → éditeur de story ;
  - éditeur sur canvas 1080×1920 à base de calques (`text`, `stat`, `route`, `photo`) : glisser pour déplacer, pincer ou tirer la poignée pour redimensionner, aimantation au centre, annuler (↺ / Ctrl+Z) ;
  - onglets Modèles (6 : classique, minimal, chiffres, photo, sticker transparent, polaroid), Éléments, Photos (restent sur l'appareil, jamais envoyées), Style (fond, palettes, couleur du texte, polices Poppins / Bebas Neue / Anton / Oswald) ;
  - « Mon style » sauvegardé en localStorage (`traceur.monstyle.v1`) ;
  - export PNG : partage natif sur mobile (vers Instagram), téléchargement sur ordi ;
  - 4 sorties d'exemple codées en dur (`DEMO_ACTIVITIES`) pour le mode sans compte.
- `traceur-server/index.html` — **fichier en trop, à supprimer** (copie uploadée au mauvais endroit).

## Secrets
Variables d'environnement sur Render uniquement, **jamais dans le code ni dans le dépôt** (il est public) :
`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SESSION_SECRET`, `NODE_ENV=production`.
Le Client Secret a été partagé en clair dans une conversation : il faudra le régénérer sur strava.com/settings/api puis le mettre à jour sur Render.

## Strava
- App Strava : Client ID 280897. « Authorization Callback Domain » = `traceur.onrender.com`.
- Mode test Strava : 1 seul athlète en plus du propriétaire. Pour ouvrir au public → demander la validation de l'app à Strava.
- La liste d'activités Strava ne donne pas les calories (il faudrait l'endpoint détail par activité).

## Tester en local
```
cd traceur-server && npm install
STRAVA_CLIENT_ID=… STRAVA_CLIENT_SECRET=… SESSION_SECRET=test PORT=3000 node server.js
```
Le mode exemple (sans compte) permet de tester tout l'éditeur sans Strava.

## Idées / suite possible
- Données COROS (fréquence cardiaque, etc.) en plus de Strava.
- Génération automatique à chaque nouvelle sortie (webhooks Strava).
- Emballer en appli Android (APK) via Capacitor.
- Modèle économique envisagé : abonnement à quelques €/mois ou packs de modèles.
