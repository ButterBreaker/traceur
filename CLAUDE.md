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
- `traceur-server/server.js` — Node/Express. Connexion Strava OAuth (`/auth/strava`, `/auth/callback`, `/auth/logout`), session en cookie signé (`cookie-session`, 30 jours), rafraîchissement auto du token, API `/api/me` et `/api/activities` (10 dernières sorties avec GPS, tracé en `summary_polyline`), et `/api/recap` (recap IA, voir plus bas).
- `traceur-server/public/index.html` — tout le front en un seul fichier (HTML + CSS + JS vanilla, aucune lib) :
  - écran de chargement → page de connexion (bouton Strava + « Voir un exemple sans compte ») → liste des sorties → éditeur de story ;
  - écran d'accueil : le coach est en premier (carte mise en avant, `coach-hero`), avec un aperçu de sa dernière réponse une fois la conversation commencée ; « Créer une story » et la liste des sorties viennent juste après, en second plan ;
  - écran « Mon coach » (`screen-coach`) : discussion avec le coach IA, ouverte depuis la carte d'accueil. La première question part toute seule ; la conversation vit dans le navigateur et repart de zéro à la déconnexion ;
  - éditeur sur canvas 1080×1920 à base de calques (`text`, `stat`, `route`, `photo`) : glisser pour déplacer, pincer ou tirer la poignée pour redimensionner, aimantation au centre, annuler (↺ / Ctrl+Z) ;
  - onglets Modèles (6 : classique, minimal, chiffres, photo, sticker transparent, polaroid), Éléments, Photos (restent sur l'appareil, jamais envoyées), Style (fond, palettes, couleur du texte, polices Poppins / Bebas Neue / Anton / Oswald) ;
  - onglet Éléments : bloc « Texte écrit par l'IA » → 3 accroches à poser sur la story (une seule à la fois, le calque est réutilisé) + une légende à copier ;
  - « Mon style » sauvegardé en localStorage (`traceur.monstyle.v1`) ;
  - export PNG : partage natif sur mobile (vers Instagram), téléchargement sur ordi ;
  - 4 sorties d'exemple codées en dur (`DEMO_ACTIVITIES`) pour le mode sans compte.
- `traceur-server/index.html` — **fichier en trop, à supprimer** (copie uploadée au mauvais endroit).

## Secrets
Variables d'environnement sur Render uniquement, **jamais dans le code ni dans le dépôt** (il est public) :
`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SESSION_SECRET`, `NODE_ENV=production`, `ANTHROPIC_API_KEY`, `DATABASE_URL`.
Le Client Secret a été partagé en clair dans une conversation : il faudra le régénérer sur strava.com/settings/api puis le mettre à jour sur Render.

## Strava
- App Strava : Client ID 280897. « Authorization Callback Domain » = `traceur.onrender.com`.
- Mode test Strava : 1 seul athlète en plus du propriétaire. Pour ouvrir au public → demander la validation de l'app à Strava.
- La liste d'activités Strava ne donne pas les calories (il faudrait l'endpoint détail par activité).

## IA (recap + coach)
Deux routes, même clé `ANTHROPIC_API_KEY`, même modèle `claude-opus-5` :
- `POST /api/recap` : chiffres d'une sortie → `{phrases:[3], legende}` pour la story (effort `low`, sortie JSON validée avec zod).
- `POST /api/coach` : les 10 dernières sorties + la conversation → `{reponse}` (effort `medium`). Le coach analyse la régularité, le volume, l'allure et le dénivelé, dit ce qu'il faut améliorer, et renvoie vers un médecin dès qu'il est question de douleur ou de blessure.

Points communs :
- Le serveur ne transmet jamais le texte du navigateur tel quel : `chiffres()` reconstruit des données propres, `ficheActivite()` et `carnet()` les mettent en forme, nom/lieu/date sont tronqués.
- `conversation()` ne garde que des tours `user`/`assistant` valides, 20 maximum, et impose que le dernier vienne du sportif.
- Garde-fou coût : 40 appels IA par heure et par adresse IP, tous types confondus (`quotas` en mémoire).
- Sans `ANTHROPIC_API_KEY`, le serveur démarre quand même, `/api/me` renvoie `ia:false`, et le bloc recap comme le bouton coach disparaissent.
- Une clé se crée sur console.anthropic.com (facturation à l'usage). Si elle est refusée, les logs Render affichent « Clé ANTHROPIC_API_KEY refusée ».

Le coach ne voit que les totaux (ni fréquence cardiaque, ni détail kilomètre par kilomètre) — suite prévue : cardio et splits via `/api/v3/activities/{id}/streams` (Strava), puis Coros.

## Base de données
- Postgres sur Render (service `traceur-db`, plan gratuit — **expire 30 jours après création**, à recréer ou passer en payant avant l'échéance). Connectée via `DATABASE_URL`.
- Facultative comme `ANTHROPIC_API_KEY` : sans elle, le serveur démarre quand même (juste un message dans les logs), mais le coach oublie tout d'une visite à l'autre.
- Deux tables, créées toutes seules au démarrage (`preparerBase()` dans `server.js`) :
  - `athletes` (`strava_id`, `firstname`) — un enregistrement par connexion Strava (`/auth/callback`).
  - `coach_messages` (`strava_id`, `role`, `content`) — l'historique de la conversation avec le coach, 40 derniers messages chargés par `GET /api/coach/history`, alimentés à chaque `POST /api/coach` réussi.
- Ce n'est pas lié à la session (cookie) : se reconnecter depuis un autre appareil retrouve la même conversation, tant que c'est le même compte Strava.
- Mode exemple (sans compte) : aucune mémoire, comme avant — pas d'identité Strava à rattacher.

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
