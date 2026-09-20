# KUMA — Messagerie et appels (PWA)

Base propre pour KUMA : messagerie temps réel, notes vocales, groupes,
statuts 24h et appels audio/vidéo WebRTC, en HTML/CSS/JS + Firebase —
même stack que vos autres projets (RECAS, Le Resto Plaza, Mali Sugu).

## Mise en route

1. **Créer un nouveau projet Firebase** (voir les instructions détaillées
   tout en haut du premier `<script>` dans `index.html`) et coller votre
   config dedans.
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
  Toutes/Non lues/Favoris/Groupes, pastille "en ligne" sur les contacts
- Conversation : messages texte temps réel, notes vocales (enregistrement
  micro → Firebase Storage → lecture), envoi de photos
- Groupes : création avec sélection de membres
- Statuts éphémères 24h (texte + image, expiration automatique via requête
  Firestore sur `expiresAt`)
- Appels audio/vidéo WebRTC 1-à-1 **et de groupe** (maillage "mesh"),
  signalisation Firestore, historique des appels
- PWA installable (`manifest.json` + `service-worker.js`), cache des
  fichiers statiques pour le mode 2G/3G

### Fonctionnalités modernes façon WhatsApp (ajoutées le 20/09/2026)

- **Présence** : "en train d'écrire...", double coche ✓ (envoyé) / ✓✓ grise
  (reçu) / ✓✓ bleue (lu), "en ligne" / "vu(e) à HH:mm" dans l'en-tête
- **Interactions sur les messages** (appui/clic sur un message) : réactions
  emoji, répondre en citant un message précis, transférer vers une autre
  discussion, modifier ou supprimer un message envoyé, épingler un message
  (bandeau en haut de la conversation)
- **Appels vidéo de groupe** : dans une discussion de groupe, les boutons
  📞/🎥 de l'en-tête démarrent ou rejoignent un appel de groupe partagé par
  tous les membres
- **Confidentialité avancée** (icône ℹ️ dans une conversation, ou menu ⋮ →
  Confidentialité) : messages éphémères par discussion (24h/7j/90j),
  blocage de contact, masquage de sa propre dernière connexion

## Ce qu'il reste à brancher

- **Serveur TURN** pour les appels au-delà d'un même réseau local (un
  compte gratuit sur metered.ca suffit pour démarrer — voir le
  commentaire dans `firebase-config.js`) — indispensable aussi pour les
  appels de groupe dès qu'un participant n'est pas sur le même réseau
- **Chiffrement bout-en-bout** des messages (actuellement les messages
  transitent en clair dans Firestore, protégés par les règles de
  sécurité mais pas chiffrés côté client)
- **Suppression serveur des messages éphémères** : la suppression après
  expiration se fait actuellement côté client (best-effort) ; pour une
  garantie fiable même app fermée, prévoir une Cloud Function planifiée
- **Mobile Money** (Orange Money / Moov Money / Wave) pour les futurs
  achats intégrés
- **IA intégrée** (assistant façon Meta AI)
- **Mode offline avec synchronisation complète** (la persistance
  Firestore est activée, mais l'envoi de messages en file d'attente
  hors-ligne n'est pas encore géré explicitement)
- **Notifications d'appel/message en arrière-plan** (Firebase Cloud
  Messaging) — pour l'instant, tout est en temps réel tant que l'app est
  ouverte, comme n'importe quelle PWA sans FCM branché

## Structure

Fichier unique, comme le reste de vos projets (Bouadigital, etc.) : tout le
CSS et le JavaScript sont inclus directement dans `index.html` (balises
`<style>` et `<script>` séparées par section, dans l'ordre : configuration
Firebase → authentification → cœur de l'app → conversation → statuts →
appels). Seuls `manifest.json` et `service-worker.js` restent des fichiers
à part : un navigateur exige que ces deux-là soient des fichiers
indépendants pour qu'une PWA soit installable et fonctionne hors-ligne.

```
kuma-web/
├── index.html          → TOUTE l'application (HTML + CSS + JS en un seul fichier)
├── manifest.json        → PWA (doit rester séparé)
├── service-worker.js    → cache hors-ligne (doit rester séparé)
├── firestore.rules       → à publier dans la console Firebase, pas dans l'app
└── storage.rules         → idem
```

Pour retrouver la config Firebase à modifier : ouvrez `index.html` et
cherchez `const firebaseConfig` (premier bloc `<script>` après les SDK
Firebase, tout en haut du fichier).
