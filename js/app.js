// KUMA — Cœur de l'application : navigation, liste de discussions, groupes

let currentUser = null;
let chatsUnsub = null;
let activeFilter = "all";

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    db.collection("users").doc(user.uid).update({
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    initChatsList();
    initStatusTab();
    initCallsTab();
  } else {
    currentUser = null;
    document.getElementById("authScreen").classList.remove("hidden");
    document.getElementById("mainApp").classList.add("hidden");
    if (chatsUnsub) chatsUnsub();
  }
});

window.addEventListener("beforeunload", () => {
  if (currentUser) {
    db.collection("users").doc(currentUser.uid).update({
      online: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }
});

// ---------- Navigation par onglets ----------
function switchTab(tab) {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("hidden", p.id !== "panel-" + tab));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tabs button").forEach(b => {
    b.addEventListener("click", () => switchTab(b.dataset.tab));
  });
  document.querySelectorAll(".filters button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".filters button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      activeFilter = b.dataset.filter;
      renderChatsList();
    });
  });
  document.getElementById("fabNewChat").addEventListener("click", openNewChatModal);
  document.getElementById("menuBtn").addEventListener("click", openMenu);
});

// ---------- Liste des discussions (temps réel) ----------
let allChats = [];

function initChatsList() {
  chatsUnsub = db.collection("chats")
    .where("members", "array-contains", currentUser.uid)
    .orderBy("lastMessageAt", "desc")
    .onSnapshot((snap) => {
      allChats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderChatsList();
    }, (err) => console.error("Erreur liste discussions:", err));
}

function renderChatsList() {
  const container = document.getElementById("chatsList");
  let chats = allChats;
  if (activeFilter === "unread") chats = chats.filter(c => (c.unread && c.unread[currentUser.uid] > 0));
  if (activeFilter === "groups") chats = chats.filter(c => c.isGroup);
  if (activeFilter === "favorites") chats = chats.filter(c => (c.favorites || []).includes(currentUser.uid));

  if (chats.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucune discussion pour le moment.<br>Touchez + pour en démarrer une.</div>`;
    return;
  }

  container.innerHTML = chats.map(c => {
    const otherName = c.isGroup ? c.name : (c.namesByUid ? c.namesByUid[otherUid(c)] : "Contact");
    const unreadCount = (c.unread && c.unread[currentUser.uid]) || 0;
    const time = c.lastMessageAt ? formatTime(c.lastMessageAt.toDate()) : "";
    const initials = (otherName || "?").slice(0, 2).toUpperCase();
    return `
      <div class="chat-item" onclick="openChat('${c.id}')">
        <div class="avatar">${initials}</div>
        <div class="meta">
          <div class="row1"><span class="name">${escapeHtml(otherName || "Discussion")}</span><span class="time">${time}</span></div>
          <div class="row2">
            <span class="last-msg">${escapeHtml(c.lastMessage || "")}</span>
            ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ""}
          </div>
        </div>
      </div>`;
  }).join("");
}

function otherUid(chat) {
  return (chat.members || []).find(u => u !== currentUser.uid);
}

function formatTime(date) {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ---------- Nouvelle discussion / nouveau groupe ----------
function openNewChatModal() {
  db.collection("users").limit(50).get().then((snap) => {
    const users = snap.docs.map(d => d.data()).filter(u => u.uid !== currentUser.uid);
    const list = users.map(u => `
      <div class="contact-pick" onclick="startDirectChat('${u.uid}','${escapeHtml(u.name)}')">
        <div class="avatar">${(u.name || "?").slice(0,2).toUpperCase()}</div>
        <div>
          <div style="font-weight:600">${escapeHtml(u.name)}</div>
          <div style="font-size:12px;color:var(--kuma-muted)">${escapeHtml(u.phone || "")}</div>
        </div>
      </div>`).join("");
    showModal(`
      <h3>Nouvelle discussion</h3>
      <button class="primary" style="margin-bottom:14px;background:var(--kuma-accent)" onclick="openNewGroupModal()">👥 Nouveau groupe</button>
      <div>${list || "<p>Aucun autre utilisateur KUMA trouvé pour le moment.</p>"}</div>
    `);
  });
}

async function startDirectChat(otherUid, otherName) {
  closeModal();
  const existing = allChats.find(c => !c.isGroup && (c.members || []).includes(otherUid));
  if (existing) { openChat(existing.id); return; }
  const ref = await db.collection("chats").add({
    isGroup: false,
    members: [currentUser.uid, otherUid],
    namesByUid: { [currentUser.uid]: currentUser.displayName || "Moi", [otherUid]: otherName },
    lastMessage: "",
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    unread: { [currentUser.uid]: 0, [otherUid]: 0 }
  });
  openChat(ref.id);
}

function openNewGroupModal() {
  db.collection("users").limit(50).get().then((snap) => {
    const users = snap.docs.map(d => d.data()).filter(u => u.uid !== currentUser.uid);
    const checks = users.map(u => `
      <label class="contact-pick">
        <input type="checkbox" value="${u.uid}" data-name="${escapeHtml(u.name)}" class="group-member-check">
        <div class="avatar">${(u.name||"?").slice(0,2).toUpperCase()}</div>
        <div>${escapeHtml(u.name)}</div>
      </label>`).join("");
    showModal(`
      <h3>Nouveau groupe</h3>
      <input type="text" id="groupNameInput" placeholder="Nom du groupe">
      <div style="max-height:240px;overflow-y:auto">${checks}</div>
      <button class="primary" onclick="createGroup()">Créer le groupe</button>
    `);
  });
}

async function createGroup() {
  const name = document.getElementById("groupNameInput").value.trim();
  const checked = Array.from(document.querySelectorAll(".group-member-check:checked"));
  if (!name || checked.length === 0) { showToast("Nom du groupe et au moins un membre requis"); return; }
  const members = [currentUser.uid, ...checked.map(c => c.value)];
  const unread = {}; members.forEach(m => unread[m] = 0);
  const ref = await db.collection("chats").add({
    isGroup: true,
    name,
    members,
    admins: [currentUser.uid],
    lastMessage: "Groupe créé",
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    unread
  });
  closeModal();
  openChat(ref.id);
}

// ---------- Modales génériques ----------
function showModal(html) {
  const overlay = document.getElementById("modalOverlay");
  document.getElementById("modalSheet").innerHTML = html;
  overlay.classList.remove("hidden");
}
function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
}

// ---------- Menu (⋮) ----------
function openMenu() {
  showModal(`
    <h3>Menu</h3>
    <button class="primary" style="margin-bottom:8px" onclick="openNewGroupModal()">Nouveau groupe</button>
    <button class="primary" style="margin-bottom:8px;background:#555" onclick="closeModal()">Appareils connectés</button>
    <button class="primary" style="margin-bottom:8px;background:#555" onclick="closeModal()">Paramètres</button>
    <button class="primary" style="background:#e74c3c" onclick="logout()">Se déconnecter</button>
  `);
}

function logout() {
  closeModal();
  if (currentUser) {
    db.collection("users").doc(currentUser.uid).update({ online: false }).catch(() => {});
  }
  auth.signOut();
}
