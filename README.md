# KUMA — Application Android (Kotlin/Jetpack Compose)

App Android native branchée sur le **même projet Firebase** que le site
web `kuma-web/`, avec les mêmes collections Firestore (`users`, `chats`,
`chats/{id}/messages`, `statuses`, `calls`) — les deux plateformes
partagent donc les mêmes discussions en temps réel.

Package : `com.armcreat.kuma`

## Mise en route (Android Studio)

1. Ouvrir ce dossier `kuma-android/` dans Android Studio (Giraffe ou plus
   récent).
2. Dans la **console Firebase**, sur le **même projet** que celui utilisé
   pour `kuma-web` : Paramètres du projet → Vos applications → Ajouter
   une application Android
   - Nom du package : `com.armcreat.kuma`
   - Télécharger `google-services.json` et le placer dans `app/`
     (à côté de `build.gradle.kts`)
3. Vérifier que les règles Firestore/Storage du dossier `kuma-web/`
   (`firestore.rules`, `storage.rules`) sont bien déployées sur ce
   projet — elles couvrent déjà l'app Android.
4. Lancer une synchronisation Gradle, puis Run sur un appareil/émulateur
   avec Google Play Services.

## Ce qui fonctionne déjà (miroir du site web)

- Connexion par numéro de téléphone (OTP Firebase Auth), choix de langue
- Liste de discussions temps réel avec filtres (Toutes/Non lues/Favoris/
  Groupes), création de discussion directe et de groupe
- Conversation : messages texte temps réel, **notes vocales**
  (enregistrement micro → Firebase Storage), envoi de photos
- Statuts éphémères 24h (texte + image)
- **Appels audio/vidéo WebRTC**, signalisation via les mêmes documents
  Firestore que le web (`offer`/`answer`/`offerCandidates`/
  `answerCandidates`) — un appel peut donc se faire entre un utilisateur
  Android et un utilisateur web

## À faire avant publication sur le Play Store

- **Icône de lancement** : un logo vectoriel simple est fourni
  (`res/drawable/ic_launcher_kuma.xml`) à remplacer par le vrai logo
  KUMA via l'assistant "Image Asset" d'Android Studio (clic droit sur
  `res` → New → Image Asset)
- **Serveur TURN** pour les appels hors réseau local (même remarque que
  pour le site web — voir `kuma-web/js/firebase-config.js`)
- **Notification d'appel entrant** en arrière-plan (actuellement
  l'écoute Firestore ne fonctionne que si l'app est ouverte ; à terme,
  utiliser Firebase Cloud Messaging + une notification plein écran pour
  réveiller l'app comme le fait WhatsApp)
- **Chiffrement bout-en-bout**, **Mobile Money**, **IA intégrée**, mode
  hors-ligne avec file d'attente d'envoi — mêmes chantiers restants que
  sur le web
- Remplacer `minifyEnabled = false` par une configuration ProGuard/R8
  avant la mise en production

## Structure

```
app/src/main/java/com/armcreat/kuma/
├── MainActivity.kt         → navigation (Discussions/Statuts/Communautés/Appels)
├── KumaApplication.kt      → initialisation Firebase
├── data/
│   ├── Models.kt            → modèles Firestore (miroir du schéma web)
│   └── KumaRepository.kt    → accès Firestore/Storage/Auth
└── ui/
    ├── auth/                 → connexion OTP + choix de langue
    ├── chats/                → liste de discussions + création groupe
    ├── chat/                 → conversation, notes vocales, photos
    ├── status/                → statuts 24h
    ├── calls/                 → appels WebRTC + historique
    └── theme/                 → couleurs KUMA (vert/accent identiques au web)
```
