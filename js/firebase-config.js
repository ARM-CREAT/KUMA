// ============================================================
// KUMA — Configuration Firebase
// ============================================================
// IMPORTANT : repartir sur un projet Firebase TOUT NEUF (les anciens
// projets kuma-983eb / kuma-app-82fde / kuma-app-fb86e ont eu des
// erreurs persistantes auth/api-key-not-valid — plutôt que de
// déboguer encore, créez un projet propre sur console.firebase.google.com)
//
// Étapes :
// 1. console.firebase.google.com → Ajouter un projet → nom au choix (ex: kuma-app)
// 2. Build > Authentication > Sign-in method > activer "Téléphone"
// 3. Build > Firestore Database > Créer la base (mode production)
// 4. Build > Storage > Commencer (pour photos/vidéos/notes vocales)
// 5. Paramètres du projet > Vos applications > Ajouter une application Web
//    → copier la config ci-dessous
// 6. Paramètres > Authentication > Settings > Domaines autorisés
//    → ajouter votre domaine Vercel (ex: kuma-beta.vercel.app)
// ============================================================

const firebaseConfig = {
  apiKey: "REMPLACER_PAR_VOTRE_API_KEY",
  authDomain: "REMPLACER.firebaseapp.com",
  projectId: "REMPLACER",
  storageBucket: "REMPLACER.appspot.com",
  messagingSenderId: "REMPLACER",
  appId: "REMPLACER"
};

// Initialisation (SDK compat — cohérent avec le reste de vos projets)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Cache local pour le mode faible consommation / offline
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  console.warn("Persistence Firestore non activée :", err.code);
});

// Serveur TURN pour les appels audio/vidéo (WebRTC) — compte gratuit
// à créer sur https://www.metered.ca/tools/openrelay/ ou https://dashboard.metered.ca/
// Sans serveur TURN, les appels échouent dès que les deux personnes ne sont
// pas sur le même réseau local.
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // { urls: "turn:VOTRE_TURN_SERVER", username: "...", credential: "..." }
  ]
};
