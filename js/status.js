// KUMA — Statuts éphémères (24h), comme les Stories WhatsApp

function initStatusTab() {
  db.collection("statuses")
    .where("expiresAt", ">", firebase.firestore.Timestamp.now())
    .orderBy("expiresAt", "desc")
    .onSnapshot((snap) => {
      const statuses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStatusTab(statuses);
    }, (err) => console.error("Erreur statuts:", err));
}

function renderStatusTab(statuses) {
  const mine = statuses.filter(s => s.userId === currentUser.uid);
  const others = statuses.filter(s => s.userId !== currentUser.uid);

  // Regrouper par utilisateur
  const byUser = {};
  others.forEach(s => {
    byUser[s.userId] = byUser[s.userId] || { name: s.userName, items: [] };
    byUser[s.userId].items.push(s);
  });

  const myItem = `
    <div class="status-list-item" onclick="openAddStatus()">
      <div class="status-ring seen"><div class="avatar">${(currentUser.displayName || "Moi").slice(0,2).toUpperCase()}</div></div>
      <div>
        <div style="font-weight:600">Mon statut</div>
        <div style="font-size:12px;color:var(--kuma-muted)">${mine.length > 0 ? mine.length + " statut(s) actif(s)" : "Touchez pour ajouter un statut"}</div>
      </div>
    </div>`;

  const recentHtml = Object.entries(byUser).map(([uid, u]) => `
    <div class="status-list-item" onclick="viewStatuses('${uid}')">
      <div class="status-ring"><div class="avatar">${(u.name || "?").slice(0,2).toUpperCase()}</div></div>
      <div>
        <div style="font-weight:600">${escapeHtml(u.name || "Contact")}</div>
        <div style="font-size:12px;color:var(--kuma-muted)">${u.items.length} statut(s)</div>
      </div>
    </div>`).join("");

  document.getElementById("statusTabContent").innerHTML = `
    ${myItem}
    <div class="section-label">Récents</div>
    ${recentHtml || '<div class="empty-state">Aucun statut récent parmi vos contacts.</div>'}
  `;
}

function openAddStatus() {
  showModal(`
    <h3>Ajouter un statut</h3>
    <input type="text" id="statusTextInput" placeholder="Écrivez quelque chose...">
    <input type="file" id="statusImageInput" accept="image/*" style="margin-bottom:12px">
    <button class="primary" onclick="publishStatus()">Publier (visible 24h)</button>
  `);
}

async function publishStatus() {
  const text = document.getElementById("statusTextInput").value.trim();
  const file = document.getElementById("statusImageInput").files[0];
  let mediaUrl = "";
  if (file) {
    const path = `status/${currentUser.uid}/${Date.now()}_${file.name}`;
    const ref = storage.ref(path);
    await ref.put(file);
    mediaUrl = await ref.getDownloadURL();
  }
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 3600 * 1000);
  await db.collection("statuses").add({
    userId: currentUser.uid,
    userName: currentUser.displayName || "Moi",
    text,
    mediaUrl,
    createdAt: firebase.firestore.Timestamp.fromDate(now),
    expiresAt: firebase.firestore.Timestamp.fromDate(expires),
    viewedBy: []
  });
  closeModal();
  showToast("Statut publié pour 24h");
}

function viewStatuses(uid) {
  db.collection("statuses").where("userId", "==", uid).get().then((snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items.forEach(it => {
      db.collection("statuses").doc(it.id).update({
        viewedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      }).catch(() => {});
    });
    const slides = items.map(it => `
      <div style="margin-bottom:16px">
        ${it.mediaUrl ? `<img src="${it.mediaUrl}" style="width:100%;border-radius:8px;margin-bottom:6px">` : ""}
        <div>${escapeHtml(it.text || "")}</div>
      </div>`).join("");
    showModal(`<h3>Statuts</h3>${slides}`);
  });
}
