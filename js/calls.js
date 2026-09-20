// KUMA — Appels audio/vidéo temps réel (WebRTC, signalisation via Firestore)
// NB : nécessite un serveur TURN pour fonctionner hors réseau local (voir firebase-config.js)

let pc = null;
let localStream = null;
let currentCallId = null;
let callsUnsub = null;

function initCallsTab() {
  callsUnsub = db.collection("calls")
    .where("participants", "array-contains", currentUser.uid)
    .orderBy("startedAt", "desc")
    .limit(50)
    .onSnapshot((snap) => {
      renderCallsTab(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erreur historique appels:", err));

  // Écoute les appels entrants
  db.collection("calls")
    .where("calleeId", "==", currentUser.uid)
    .where("status", "==", "ringing")
    .onSnapshot((snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") showIncomingCall({ id: change.doc.id, ...change.doc.data() });
      });
    });
}

function renderCallsTab(calls) {
  const container = document.getElementById("callsTabContent");
  if (calls.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucun appel récent.</div>`;
    return;
  }
  container.innerHTML = calls.map(c => {
    const missed = c.status === "missed";
    const icon = c.video ? "🎥" : "📞";
    const dir = c.callerId === currentUser.uid ? "↗" : "↙";
    const otherName = c.callerId === currentUser.uid ? c.calleeName : c.callerName;
    const time = c.startedAt ? c.startedAt.toDate().toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
    return `
      <div class="call-item">
        <div class="avatar">${(otherName||"?").slice(0,2).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:600">${escapeHtml(otherName || "Contact")}</div>
          <div class="call-icon ${missed ? "missed" : ""}">${dir} ${icon} ${time}</div>
        </div>
      </div>`;
  }).join("");
}

// ---------- Démarrer un appel ----------
async function startCall(calleeUid, calleeName, video) {
  currentCallId = db.collection("calls").doc().id;
  pc = new RTCPeerConnection(RTC_CONFIG);
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  showCallScreen(calleeName, video, true);

  const remoteStream = new MediaStream();
  document.getElementById("remoteVideo").srcObject = remoteStream;
  pc.ontrack = (e) => e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));

  const callDoc = db.collection("calls").doc(currentCallId);
  const offerCandidates = callDoc.collection("offerCandidates");
  const answerCandidates = callDoc.collection("answerCandidates");

  pc.onicecandidate = (e) => { if (e.candidate) offerCandidates.add(e.candidate.toJSON()); };

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  await callDoc.set({
    callerId: currentUser.uid,
    callerName: currentUser.displayName || "Moi",
    calleeId: calleeUid,
    calleeName,
    video,
    status: "ringing",
    participants: [currentUser.uid, calleeUid],
    startedAt: firebase.firestore.FieldValue.serverTimestamp(),
    offer: { type: offerDescription.type, sdp: offerDescription.sdp }
  });

  callDoc.onSnapshot((snap) => {
    const data = snap.data();
    if (data && data.answer && pc.currentRemoteDescription === null) {
      pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
    if (data && (data.status === "ended" || data.status === "declined")) endCall(false);
  });

  answerCandidates.onSnapshot((snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    });
  });
}

// ---------- Recevoir un appel ----------
function showIncomingCall(call) {
  currentCallId = call.id;
  showModal(`
    <h3>${call.video ? "📹" : "📞"} Appel entrant</h3>
    <p>${escapeHtml(call.callerName)} vous appelle...</p>
    <button class="primary" style="background:var(--kuma-accent)" onclick="answerCall('${call.id}', ${!!call.video})">Répondre</button>
    <button class="primary" style="background:#e74c3c;margin-top:8px" onclick="declineCall('${call.id}')">Refuser</button>
  `);
}

async function answerCall(callId, video) {
  closeModal();
  const callDoc = db.collection("calls").doc(callId);
  const callSnap = await callDoc.get();
  const callData = callSnap.data();

  pc = new RTCPeerConnection(RTC_CONFIG);
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  showCallScreen(callData.callerName, video, false);

  const remoteStream = new MediaStream();
  document.getElementById("remoteVideo").srcObject = remoteStream;
  pc.ontrack = (e) => e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));

  const offerCandidates = callDoc.collection("offerCandidates");
  const answerCandidates = callDoc.collection("answerCandidates");
  pc.onicecandidate = (e) => { if (e.candidate) answerCandidates.add(e.candidate.toJSON()); };

  await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  await callDoc.update({
    status: "active",
    answer: { type: answerDescription.type, sdp: answerDescription.sdp }
  });

  offerCandidates.onSnapshot((snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    });
  });

  callDoc.onSnapshot((snap) => {
    const data = snap.data();
    if (data && data.status === "ended") endCall(false);
  });
}

function declineCall(callId) {
  closeModal();
  db.collection("calls").doc(callId).update({ status: "declined" });
}

// ---------- Interface d'appel ----------
function showCallScreen(name, video, isCaller) {
  document.getElementById("callPeerName").textContent = name;
  document.getElementById("callScreen").classList.remove("hidden");
  document.getElementById("localVideo").classList.toggle("hidden", !video);
  document.getElementById("remoteVideo").classList.toggle("hidden", !video);
  if (video && localStream) document.getElementById("localVideo").srcObject = localStream;
}

async function endCall(updateFirestore = true) {
  if (updateFirestore && currentCallId) {
    db.collection("calls").doc(currentCallId).update({ status: "ended" }).catch(() => {});
  }
  if (pc) { pc.close(); pc = null; }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  document.getElementById("callScreen").classList.add("hidden");
  currentCallId = null;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("endCallBtn").addEventListener("click", () => endCall(true));
});
