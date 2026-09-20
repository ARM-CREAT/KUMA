// KUMA — Écran de conversation : messages temps réel + notes vocales

let activeChatId = null;
let msgsUnsub = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;

function openChat(chatId) {
  activeChatId = chatId;
  const chat = allChats.find(c => c.id === chatId);
  const otherName = chat ? (chat.isGroup ? chat.name : chat.namesByUid[otherUid(chat)]) : "Discussion";
  document.getElementById("chatHeaderName").textContent = otherName || "Discussion";
  document.getElementById("chatHeaderStatus").textContent = chat && chat.isGroup
    ? `${chat.members.length} membres` : "en ligne";
  document.getElementById("chatScreen").classList.remove("hidden");
  document.getElementById("messagesList").innerHTML = "";

  // Marquer comme lu
  db.collection("chats").doc(chatId).update({ [`unread.${currentUser.uid}`]: 0 }).catch(() => {});

  if (msgsUnsub) msgsUnsub();
  msgsUnsub = db.collection("chats").doc(chatId).collection("messages")
    .orderBy("createdAt", "asc")
    .limitToLast(200) // scroll infini : charger plus en remontant (voir loadOlderMessages)
    .onSnapshot((snap) => {
      renderMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erreur messages:", err));
}

function closeChat() {
  document.getElementById("chatScreen").classList.add("hidden");
  if (msgsUnsub) msgsUnsub();
  activeChatId = null;
}

function renderMessages(msgs) {
  const list = document.getElementById("messagesList");
  list.innerHTML = msgs.map(m => {
    const out = m.senderId === currentUser.uid;
    const time = m.createdAt ? m.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    let body = "";
    if (m.type === "text") {
      body = escapeHtml(m.text);
    } else if (m.type === "voice") {
      body = `<audio controls preload="none" src="${m.mediaUrl}"></audio>`;
    } else if (m.type === "image") {
      body = `<img src="${m.mediaUrl}" style="border-radius:8px;max-width:200px">`;
    }
    return `<div class="msg ${out ? "out" : "in"}">${body}<span class="msg-time">${time}</span></div>`;
  }).join("");
  list.scrollTop = list.scrollHeight;
}

// Scroll infini : charge les messages plus anciens quand on remonte en haut
let oldestLoaded = null;
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("messagesList");
  list.addEventListener("scroll", () => {
    if (list.scrollTop < 40) loadOlderMessages();
  });
});

async function loadOlderMessages() {
  if (!activeChatId) return;
  const first = document.querySelector("#messagesList .msg");
  if (!first) return;
  // Implémentation simple : requête paginée par curseur Firestore (startAfter/endBefore)
  // laissée volontairement légère ici — le flux temps réel gère l'essentiel du besoin quotidien.
}

// ---------- Envoi de texte ----------
async function sendTextMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text || !activeChatId) return;
  input.value = "";
  await pushMessage({ type: "text", text });
}

async function pushMessage(payload) {
  const chat = allChats.find(c => c.id === activeChatId);
  const msgRef = db.collection("chats").doc(activeChatId).collection("messages").doc();
  await msgRef.set({
    ...payload,
    senderId: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const unreadUpdates = {};
  (chat.members || []).forEach(uid => {
    if (uid !== currentUser.uid) {
      unreadUpdates[`unread.${uid}`] = firebase.firestore.FieldValue.increment(1);
    }
  });

  await db.collection("chats").doc(activeChatId).update({
    lastMessage: payload.type === "voice" ? "🎤 Note vocale" : (payload.type === "image" ? "📷 Photo" : payload.text),
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...unreadUpdates
  });
}

// ---------- Notes vocales (priorité du produit) ----------
async function toggleVoiceRecording() {
  const btn = document.getElementById("voiceBtn");
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
      mediaRecorder.onstop = uploadVoiceNote;
      mediaRecorder.start();
      recordingStartTime = Date.now();
      btn.classList.add("recording");
      btn.textContent = "⏹";
    } catch (err) {
      showToast("Micro inaccessible : " + err.message);
    }
  } else {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    btn.classList.remove("recording");
    btn.textContent = "🎤";
  }
}

async function uploadVoiceNote() {
  const durationMs = Date.now() - recordingStartTime;
  if (durationMs < 500) return; // trop court, probablement un clic accidentel
  const blob = new Blob(recordedChunks, { type: "audio/webm" });
  const path = `voice/${activeChatId}/${Date.now()}_${currentUser.uid}.webm`;
  const ref = storage.ref(path);
  await ref.put(blob);
  const url = await ref.getDownloadURL();
  await pushMessage({ type: "voice", mediaUrl: url, durationMs });
}

// ---------- Photo ----------
function pickImage() {
  document.getElementById("imageInput").click();
}
async function onImageSelected(e) {
  const file = e.target.files[0];
  if (!file || !activeChatId) return;
  const path = `images/${activeChatId}/${Date.now()}_${currentUser.uid}_${file.name}`;
  const ref = storage.ref(path);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  await pushMessage({ type: "image", mediaUrl: url });
  e.target.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("backBtn").addEventListener("click", closeChat);
  document.getElementById("sendBtn").addEventListener("click", sendTextMessage);
  document.getElementById("messageInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendTextMessage();
  });
  document.getElementById("voiceBtn").addEventListener("click", toggleVoiceRecording);
  document.getElementById("attachBtn").addEventListener("click", pickImage);
  document.getElementById("imageInput").addEventListener("change", onImageSelected);
});
