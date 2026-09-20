// KUMA — Authentification par numéro de téléphone (OTP Firebase)

let confirmationResult = null;
let selectedLang = localStorage.getItem("kuma_lang") || "fr";

const I18N = {
  fr: { welcome: "Discutez librement, où que vous soyez", send: "Envoyer le code", verify: "Vérifier", name: "Votre nom" },
  bm: { welcome: "Kuma hɔrɔnya la, yɔrɔ o yɔrɔ i bɛ", send: "Kodo ci", verify: "Lajɛ", name: "I tɔgɔ" },
  ff: { welcome: "Wowlu hino, e nokku fof", send: "Neldu kod", verify: "Ƴeewndo", name: "Innde maa" },
  sn: { welcome: "Kaaya diina, yi kaŋ", send: "Kod moxu", verify: "Xayma", name: "I tuurax" },
  tm: { welcome: "Iwal daɣ tenaɣt", send: "Azn awal", verify: "Sasat", name: "Isem-nnek" }
};

function setLang(lang) {
  selectedLang = lang;
  localStorage.setItem("kuma_lang", lang);
  document.querySelectorAll(".lang-select button").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  const t = I18N[lang] || I18N.fr;
  document.getElementById("authTagline").textContent = t.welcome;
  document.getElementById("sendCodeBtn").textContent = t.send;
  document.getElementById("verifyCodeBtn").textContent = t.verify;
  document.getElementById("displayName").placeholder = t.name;
}

function setupRecaptcha() {
  if (window.recaptchaVerifier) return;
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
    size: "invisible"
  });
}

async function sendOtp() {
  const phone = document.getElementById("phoneInput").value.trim();
  if (!phone.startsWith("+")) {
    showToast("Utilisez le format international, ex : +223 70 00 00 00");
    return;
  }
  setupRecaptcha();
  try {
    confirmationResult = await auth.signInWithPhoneNumber(phone, window.recaptchaVerifier);
    document.getElementById("step-phone").classList.add("hidden");
    document.getElementById("step-code").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showToast("Échec de l'envoi du code : " + err.message);
    window.recaptchaVerifier.render().then((id) => grecaptcha.reset(id));
  }
}

async function verifyOtp() {
  const code = document.getElementById("codeInput").value.trim();
  const name = document.getElementById("displayName").value.trim() || "Utilisateur KUMA";
  if (!confirmationResult) return;
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      phone: user.phoneNumber,
      name,
      lang: selectedLang,
      photoURL: "",
      about: "Disponible",
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true
    }, { merge: true });
    // onAuthStateChanged (app.js) prend le relais pour afficher l'app
  } catch (err) {
    console.error(err);
    showToast("Code invalide, réessayez.");
  }
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  setLang(selectedLang);
  document.querySelectorAll(".lang-select button").forEach(b => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });
  document.getElementById("sendCodeBtn").addEventListener("click", sendOtp);
  document.getElementById("verifyCodeBtn").addEventListener("click", verifyOtp);
});
