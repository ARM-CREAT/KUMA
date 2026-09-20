# KUMA — Messagerie et appels (PWA)

Base propre pour KUMA : messagerie temps réel, notes vocales, groupes,
statuts 24h et appels audio/vidéo WebRTC, en HTML/CSS/JS + Firebase —
même stack que vos autres projets (RECAS, Le Resto Plaza, Mali Sugu).

## Mise en route

1. **Créer un nouveau projet Firebase** (voir les instructions détaillées
   en haut de `js/firebase-config.js`) et coller votre config dedans.
2. **Publier les règles** :
   ```
   firebase deploy --only firestore:rules,storage:rules
   ```
   (ou copier-coller `firestore.rules` / `storage.rules` dans la console)
3. **Déployer** : glisser le dossier sur Vercel comme d'habitude, ou :
   ```
   vercel --prod
   ```
4. Ajouter le domaine Vercel dans Firebase Authentication → Settings →
   Domaines autorisés.

## Ce qui fonctionne déjà

- Connexion par numéro de téléphone (OTP Firebase), écran de sélection
  de langue (FR/Bambara/Fulfulde/Soninké/Tamasheq)
- Liste de discussions temps réel (Firestore `onSnapshot`), filtres
  Toutes/Non lues/Favoris/Groupes
- Conversation : messages texte temps réel, notes vocales (enregistrement
  micro → Firebase Storage → lecture), envoi de photos
- Groupes : création avec sélection de membres
- Statuts éphémères 24h (texte + image, expiration automatique via requête
  Firestore sur `expiresAt`)
- Appels audio/vidéo WebRTC avec signalisation Firestore (offre/réponse/
  candidats ICE), historique des appels
- PWA installable (`manifest.json` + `service-worker.js`), cache des
  fichiers statiques pour le mode 2G/3G

## Ce qu'il reste à brancher

- **Serveur TURN** pour les appels au-delà d'un même réseau local (un
  compte gratuit sur metered.ca suffit pour démarrer — voir le
  commentaire dans `firebase-config.js`)
- **Chiffrement bout-en-bout** des messages (actuellement les messages
  transitent en clair dans Firestore, protégés par les règles de
  sécurité mais pas chiffrés côté client)
- **Mobile Money** (Orange Money / Moov Money / Wave) pour les futurs
  achats intégrés
- **IA intégrée** (assistant façon Meta AI)
- **Mode offline avec synchronisation complète** (la persistance
  Firestore est activée, mais l'envoi de messages en file d'attente
  hors-ligne n'est pas encore géré explicitement)
- **App Android** en Kotlin/Jetpack Compose, branchée sur ce même projet
  Firebase (prochaine étape)

## Structure

```
kuma-web/
├── index.html          → écran unique (auth + app + conversation + appel)
├── manifest.json        → PWA
├── service-worker.js    → cache hors-ligne
├── firestore.rules
├── storage.rules
├── css/style.css
└── js/
    ├── firebase-config.js  → À REMPLIR avec votre config Firebase
    ├── auth.js              → OTP téléphone + langues
    ├── app.js                → navigation, liste discussions, groupes
    ├── chat.js               → messages temps réel + notes vocales
    ├── status.js             → statuts 24h
    └── calls.js              → appels WebRTC
```
