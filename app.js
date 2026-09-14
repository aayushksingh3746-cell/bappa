// ============================================================
// GANPATI DIGITAL DARSHAN
// app.js
// Firebase + WebRTC Viewer + Sankalp + Aarti + Countdown
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  push,
  onValue,
  onChildAdded,
  off
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  databaseURL: "https://ganpati-5f24e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);


// ============================================================
// WEBRTC CONFIG
// ============================================================
//
// STUN is included by default.
//
// TURN credentials must be real credentials.
// DO NOT put fake TURN credentials here.
//

const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  }

  /*
  // Add a REAL TURN server here when available:

  {
    urls: [
      "turn:YOUR-TURN-SERVER:3478?transport=udp",
      "turn:YOUR-TURN-SERVER:3478?transport=tcp",
      "turns:YOUR-TURN-SERVER:5349?transport=tcp"
    ],
    username: "YOUR_USERNAME",
    credential: "YOUR_PASSWORD"
  }
  */
];


// ============================================================
// DOM
// ============================================================

const activeStreamUI = document.getElementById("active-stream-ui");
const offlineStreamUI = document.getElementById("offline-stream-ui");
const liveVideo = document.getElementById("liveVideo");

const prayerForm = document.getElementById("prayerForm");
const prayerInput = document.getElementById("prayerInput");
const prayerStatus = document.getElementById("prayerStatus");
const prayerWall = document.getElementById("prayerWall");

const heroSankalp = document.getElementById("heroSankalp");

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");

const playPause = document.getElementById("playPause");
const playIcon = document.getElementById("playIcon");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const trackTitle = document.getElementById("trackTitle");
const trackNumber = document.getElementById("trackNumber");
const trackList = document.getElementById("trackList");
const aartiAudio = document.getElementById("aartiAudio");

const pushpanjali = document.getElementById("pushpanjali");
const petalCanvas = document.getElementById("petalCanvas");
const bellAudio = document.getElementById("bellAudio");


// ============================================================
// GENERAL STATE
// ============================================================

let broadcastActive = false;
let currentBroadcastId = null;

let viewerId = null;
let peerConnection = null;

let remoteDescriptionSet = false;
let pendingRemoteCandidates = [];

let offerUnsubscribe = null;
let broadcasterCandidateUnsubscribe = null;
let broadcastUnsubscribe = null;

let reconnectTimer = null;
let reconnectAttempts = 0;

let manuallyStopped = false;
let connectionStarting = false;

let currentRegisteredViewerRef = null;


// ============================================================
// HELPERS
// ============================================================

function createId(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10)
  );
}


function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${String(secs).padStart(2, "0")}`;
}


function showLiveUI() {
  if (activeStreamUI) {
    activeStreamUI.classList.remove("hidden");
  }

  if (offlineStreamUI) {
    offlineStreamUI.classList.add("hidden");
  }
}


function showOfflineUI() {
  if (activeStreamUI) {
    activeStreamUI.classList.add("hidden");
  }

  if (offlineStreamUI) {
    offlineStreamUI.classList.remove("hidden");
  }
}


function setPrayerStatus(message, type = "") {
  if (!prayerStatus) return;

  prayerStatus.textContent = message;
  prayerStatus.className = "form-status";

  if (type) {
    prayerStatus.classList.add(type);
  }
}


// ============================================================
// LIVE DARSHAN
// ============================================================

function generateViewerId() {
  viewerId = createId("viewer");
  return viewerId;
}


function getViewerSignalRef() {
  if (!viewerId) return null;

  return ref(db, `pandal/signals/${viewerId}`);
}


async function registerViewer() {
  if (!viewerId || !currentBroadcastId) return;

  currentRegisteredViewerRef = ref(
    db,
    `pandal/viewers/${viewerId}`
  );

  await set(currentRegisteredViewerRef, {
    active: true,
    broadcastId: currentBroadcastId,
    createdAt: Date.now()
  });
}


async function unregisterViewer() {
  if (!viewerId) return;

  try {
    await update(
      ref(db, `pandal/viewers/${viewerId}`),
      {
        active: false,
        updatedAt: Date.now()
      }
    );
  } catch (error) {
    console.warn("Unable to update viewer state:", error);
  }
}


function removeFirebaseListeners() {
  if (offerUnsubscribe) {
    offerUnsubscribe();
    offerUnsubscribe = null;
  }

  if (broadcasterCandidateUnsubscribe) {
    broadcasterCandidateUnsubscribe();
    broadcasterCandidateUnsubscribe = null;
  }
}


async function cleanupPeerConnection(removeViewer = true) {
  removeFirebaseListeners();

  remoteDescriptionSet = false;
  pendingRemoteCandidates = [];

  if (peerConnection) {
    try {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.oniceconnectionstatechange = null;

      peerConnection.close();
    } catch (error) {
      console.warn("Peer close error:", error);
    }

    peerConnection = null;
  }

  if (liveVideo) {
    try {
      liveVideo.srcObject = null;
    } catch (_) {}
  }

  if (removeViewer && viewerId) {
    await unregisterViewer();
  }

  currentRegisteredViewerRef = null;
}


async function sendViewerCandidate(candidate) {
  if (!viewerId || !candidate) return;

  const candidateRef = push(
    ref(db, `pandal/signals/${viewerId}/viewerCandidates`)
  );

  await set(candidateRef, candidate.toJSON());
}


async function processRemoteCandidate(candidateData) {
  if (!candidateData) return;

  try {
    const candidate = new RTCIceCandidate(candidateData);

    if (!remoteDescriptionSet || !peerConnection) {
      pendingRemoteCandidates.push(candidate);
      return;
    }

    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.warn("Remote ICE candidate error:", error);
  }
}


async function flushRemoteCandidates() {
  if (!peerConnection || !remoteDescriptionSet) {
    return;
  }

  const candidates = [...pendingRemoteCandidates];
  pendingRemoteCandidates = [];

  for (const candidate of candidates) {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.warn("Queued ICE candidate error:", error);
    }
  }
}


async function handleOffer(offerData) {
  if (!offerData || manuallyStopped) return;

  if (!peerConnection) {
    await createViewerPeer();
  }

  if (!peerConnection) return;

  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(offerData)
    );

    remoteDescriptionSet = true;

    await flushRemoteCandidates();

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    await set(
      ref(db, `pandal/signals/${viewerId}/answer`),
      {
        type: peerConnection.localDescription.type,
        sdp: peerConnection.localDescription.sdp
      }
    );

    console.log("[WebRTC] Answer sent.");
  } catch (error) {
    console.error("[WebRTC] Offer handling failed:", error);

    scheduleReconnect();
  }
}


function listenForOffer() {
  if (!viewerId) return;

  const offerRef = ref(
    db,
    `pandal/signals/${viewerId}/offer`
  );

  const callback = async snapshot => {
    const offer = snapshot.val();

    if (!offer) return;

    console.log("[WebRTC] Offer received.");

    await handleOffer(offer);
  };

  onValue(offerRef, callback);

  offerUnsubscribe = () => {
    off(offerRef, "value", callback);
  };
}


function listenForBroadcasterCandidates() {
  if (!viewerId) return;

  const candidatesRef = ref(
    db,
    `pandal/signals/${viewerId}/broadcasterCandidates`
  );

  const callback = snapshot => {
    const candidateData = snapshot.val();

    if (!candidateData) return;

    processRemoteCandidate(candidateData);
  };

  onChildAdded(candidatesRef, callback);

  broadcasterCandidateUnsubscribe = () => {
    off(candidatesRef, "child_added", callback);
  };
}


async function createViewerPeer() {
  if (manuallyStopped || !currentBroadcastId) {
    return;
  }

  if (connectionStarting) {
    return;
  }

  connectionStarting = true;

  try {
    if (peerConnection) {
      try {
        peerConnection.close();
      } catch (_) {}
    }

    remoteDescriptionSet = false;
    pendingRemoteCandidates = [];

    peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    });

    peerConnection.ontrack = event => {
      console.log("[WebRTC] Remote track received.");

      if (!liveVideo) return;

      if (event.streams && event.streams[0]) {
        liveVideo.srcObject = event.streams[0];
      } else {
        let stream = liveVideo.srcObject;

        if (!(stream instanceof MediaStream)) {
          stream = new MediaStream();
          liveVideo.srcObject = stream;
        }

        stream.addTrack(event.track);
      }

      showLiveUI();

      liveVideo.play().catch(() => {
        console.log("[WebRTC] Browser requires user interaction for playback.");
      });
    };


    peerConnection.onicecandidate = async event => {
      if (!event.candidate) return;

      try {
        await sendViewerCandidate(event.candidate);
      } catch (error) {
        console.warn("[WebRTC] Failed to send ICE candidate:", error);
      }
    };


    peerConnection.onconnectionstatechange = () => {
      if (!peerConnection) return;

      const state = peerConnection.connectionState;

      console.log("[WebRTC] Connection state:", state);

      if (state === "connected") {
        reconnectAttempts = 0;
      }

      if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        scheduleReconnect();
      }
    };


    peerConnection.oniceconnectionstatechange = () => {
      if (!peerConnection) return;

      const state = peerConnection.iceConnectionState;

      console.log("[WebRTC] ICE state:", state);

      if (state === "connected" || state === "completed") {
        reconnectAttempts = 0;
      }

      if (state === "failed") {
        scheduleReconnect();
      }

      if (state === "disconnected") {
        scheduleReconnect();
      }
    };


    listenForOffer();
    listenForBroadcasterCandidates();

  } catch (error) {
    console.error("[WebRTC] Peer creation failed:", error);
    scheduleReconnect();
  } finally {
    connectionStarting = false;
  }
}


async function startViewer() {
  if (!broadcastActive || !currentBroadcastId) {
    showOfflineUI();
    return;
  }

  manuallyStopped = false;

  clearTimeout(reconnectTimer);

  await cleanupPeerConnection(true);

  generateViewerId();

  try {
    await registerViewer();

    listenForOffer();
    listenForBroadcasterCandidates();

    await createViewerPeer();

    console.log("[WebRTC] Viewer started:", viewerId);
  } catch (error) {
    console.error("[WebRTC] Viewer startup failed:", error);

    scheduleReconnect();
  }
}


async function stopViewer() {
  manuallyStopped = true;

  clearTimeout(reconnectTimer);

  await cleanupPeerConnection(true);

  viewerId = null;
  showOfflineUI();
}


function scheduleReconnect() {
  if (manuallyStopped || !broadcastActive) {
    return;
  }

  if (reconnectTimer) {
    return;
  }

  reconnectAttempts++;

  const delay = Math.min(
    30000,
    1000 * Math.pow(2, Math.min(reconnectAttempts - 1, 5))
  );

  console.log(
    `[WebRTC] Reconnecting in ${delay}ms...`
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    if (!broadcastActive || manuallyStopped) {
      return;
    }

    await startViewer();
  }, delay);
}


// ============================================================
// BROADCAST STATE
// ============================================================

function listenToBroadcast() {
  const broadcastRef = ref(db, "pandal/broadcast");

  const callback = async snapshot => {
    const data = snapshot.val();

    const active =
      !!data &&
      data.active === true &&
      !!data.id;

    if (!active) {
      broadcastActive = false;
      currentBroadcastId = null;

      clearTimeout(reconnectTimer);

      await stopViewer();

      return;
    }

    const newBroadcastId = data.id;

    if (!broadcastActive) {
      broadcastActive = true;
      currentBroadcastId = newBroadcastId;

      showLiveUI();

      await startViewer();

      return;
    }

    if (currentBroadcastId !== newBroadcastId) {
      console.log("[WebRTC] Broadcaster restarted.");

      currentBroadcastId = newBroadcastId;

      await startViewer();
    }
  };

  onValue(broadcastRef, callback);

  broadcastUnsubscribe = () => {
    off(broadcastRef, "value", callback);
  };
}


// ============================================================
// SANKALP
// ============================================================

async function submitPrayer(event) {
  event.preventDefault();

  if (!prayerInput) return;

  const text = prayerInput.value.trim();

  if (!text) {
    setPrayerStatus("Please write your prayer.", "error");
    return;
  }

  if (text.length > 50) {
    setPrayerStatus("Your prayer must be 50 characters or less.", "error");
    return;
  }

  const prayerRef = push(
    ref(db, "pandal/prayers_wall")
  );

  try {
    await set(prayerRef, {
      text,
      createdAt: Date.now()
    });

    prayerInput.value = "";

    setPrayerStatus(
      "Your prayer has been offered with devotion.",
      "success"
    );

  } catch (error) {
    console.error("Prayer submission failed:", error);

    setPrayerStatus(
      "Unable to offer your prayer right now. Please try again.",
      "error"
    );
  }
}


function renderPrayer(id, prayer) {
  if (!prayerWall || !prayer) return;

  const article = document.createElement("article");

  article.className = "prayer-card";
  article.dataset.id = id;

  const text = document.createElement("p");

  text.textContent = prayer.text || "";

  article.appendChild(text);

  prayerWall.appendChild(article);
}


function loadPrayers() {
  if (!prayerWall) return;

  const prayersRef = ref(db, "pandal/prayers_wall");

  onValue(prayersRef, snapshot => {
    prayerWall.innerHTML = "";

    const prayers = snapshot.val();

    if (!prayers) {
      return;
    }

    const entries = Object.entries(prayers)
      .sort((a, b) => {
        return (
          Number(a[1]?.createdAt || 0) -
          Number(b[1]?.createdAt || 0)
        );
      });

    for (const [id, prayer] of entries) {
      renderPrayer(id, prayer);
    }
  });
}


// ============================================================
// HERO SANKALP BUTTON
// ============================================================

if (heroSankalp) {
  heroSankalp.addEventListener("click", () => {
    const section = document.getElementById("sankalp");

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    setTimeout(() => {
      if (prayerInput) {
        prayerInput.focus();
      }
    }, 600);
  });
}


// ============================================================
// AARTI PLAYER
// ============================================================

const tracks = [
  {
    title: "Gajanana",
    src: "./assets/Gajanana.mp3"
  },
  {
    title: "Ganpati Bappa Moriya Humse Badhkar Kaun",
    src: "./assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  },
  {
    title: "Jalwa Mera Hi Jalwa",
    src: "./assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  },
  {
    title: "Sukhkarta Dukhharta",
    src: "./assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  },
  {
    title: "Jai Ganesh Jai Ganesh Deva",
    src: "./assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  },
  {
    title: "Maurya Re",
    src: "./assets/Maurya Re Don 2006 128 Kbps.mp3"
  },
  {
    title: "Shendur Laal Chadhayo",
    src: "./assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  },
  {
    title: "Suno Ganpati Bappa Morya",
    src: "./assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  },
  {
    title: "Shree Ganeshay Dheemahi",
    src: "./assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  }
];

let currentTrackIndex = 0;


function loadTrack(index, autoplay = false) {
  if (!aartiAudio || !tracks[index]) return;

  currentTrackIndex = index;

  const track = tracks[index];

  aartiAudio.src = track.src;
  aartiAudio.load();

  if (trackTitle) {
    trackTitle.textContent = track.title;
  }

  if (trackNumber) {
    trackNumber.textContent =
      `${index + 1} / ${tracks.length}`;
  }

  if (progress) {
    progress.value = 0;
  }

  if (currentTimeEl) {
    currentTimeEl.textContent = "0:00";
  }

  if (durationEl) {
    durationEl.textContent = "0:00";
  }

  updateTrackList();

  if (autoplay) {
    aartiAudio.play()
      .then(() => {
        updatePlayButton();
      })
      .catch(error => {
        console.warn("Audio playback blocked:", error);
      });
  }
}


function updateTrackList() {
  if (!trackList) return;

  trackList.innerHTML = "";

  tracks.forEach((track, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "track-item";

    if (index === currentTrackIndex) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong></strong>
    `;

    button.querySelector("strong").textContent =
      track.title;

    button.addEventListener("click", () => {
      loadTrack(index, true);
    });

    trackList.appendChild(button);
  });
}


function updatePlayButton() {
  if (!playIcon || !playPause || !aartiAudio) {
    return;
  }

  if (aartiAudio.paused) {
    playIcon.textContent = "▶";
    playPause.setAttribute("aria-label", "Play");
  } else {
    playIcon.textContent = "Ⅱ";
    playPause.setAttribute("aria-label", "Pause");
  }
}


if (playPause) {
  playPause.addEventListener("click", async () => {
    if (!aartiAudio) return;

    if (aartiAudio.paused) {
      try {
        await aartiAudio.play();
      } catch (error) {
        console.warn("Unable to play audio:", error);
      }
    } else {
      aartiAudio.pause();
    }

    updatePlayButton();
  });
}


if (aartiAudio) {
  aartiAudio.addEventListener("loadedmetadata", () => {
    if (durationEl) {
      durationEl.textContent =
        formatTime(aartiAudio.duration);
    }
  });

  aartiAudio.addEventListener("timeupdate", () => {
    if (!aartiAudio.duration) return;

    if (progress) {
      progress.value =
        (aartiAudio.currentTime / aartiAudio.duration) * 100;
    }

    if (currentTimeEl) {
      currentTimeEl.textContent =
        formatTime(aartiAudio.currentTime);
    }

    if (durationEl) {
      durationEl.textContent =
        formatTime(aartiAudio.duration);
    }
  });

  aartiAudio.addEventListener("play", updatePlayButton);
  aartiAudio.addEventListener("pause", updatePlayButton);

  aartiAudio.addEventListener("ended", () => {
    const next =
      (currentTrackIndex + 1) % tracks.length;

    loadTrack(next, true);
  });
}


if (progress) {
  progress.addEventListener("input", () => {
    if (!aartiAudio || !aartiAudio.duration) {
      return;
    }

    aartiAudio.currentTime =
      (Number(progress.value) / 100) *
      aartiAudio.duration;
  });
}


// ============================================================
// COUNTDOWN
// ============================================================

const targetDate = new Date(
  "2026-09-24T00:00:00+05:30"
).getTime();


function updateCountdown() {
  const now = Date.now();
  const difference = targetDate - now;

  if (difference <= 0) {
    if (daysEl) daysEl.textContent = "00";
    if (hoursEl) hoursEl.textContent = "00";
    if (minutesEl) minutesEl.textContent = "00";
    if (secondsEl) secondsEl.textContent = "00";

    return;
  }

  const days =
    Math.floor(difference / 86400000);

  const hours =
    Math.floor((difference % 86400000) / 3600000);

  const minutes =
    Math.floor((difference % 3600000) / 60000);

  const seconds =
    Math.floor((difference % 60000) / 1000);

  if (daysEl) {
    daysEl.textContent =
      String(days).padStart(2, "0");
  }

  if (hoursEl) {
    hoursEl.textContent =
      String(hours).padStart(2, "0");
  }

  if (minutesEl) {
    minutesEl.textContent =
      String(minutes).padStart(2, "0");
  }

  if (secondsEl) {
    secondsEl.textContent =
      String(seconds).padStart(2, "0");
  }
}


updateCountdown();
setInterval(updateCountdown, 1000);


// ============================================================
// PUSHPANJALI
// ============================================================

let petalAnimationFrame = null;
let petals = [];


function resizePetalCanvas() {
  if (!petalCanvas) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  petalCanvas.width =
    window.innerWidth * dpr;

  petalCanvas.height =
    window.innerHeight * dpr;

  petalCanvas.style.width =
    window.innerWidth + "px";

  petalCanvas.style.height =
    window.innerHeight + "px";

  const ctx = petalCanvas.getContext("2d");

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );
}


function createPetal() {
  return {
    x: Math.random() * window.innerWidth,
    y: -30 - Math.random() * 100,
    size: 5 + Math.random() * 7,
    speed: 1 + Math.random() * 2,
    drift: -0.5 + Math.random(),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: -0.03 + Math.random() * 0.06,
    opacity: 0.5 + Math.random() * 0.5
  };
}


function drawPetals() {
  if (!petalCanvas) return;

  const ctx = petalCanvas.getContext("2d");

  ctx.clearRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );

  petals.forEach(petal => {
    petal.y += petal.speed;
    petal.x += petal.drift;
    petal.rotation += petal.rotationSpeed;

    ctx.save();

    ctx.translate(
      petal.x,
      petal.y
    );

    ctx.rotate(petal.rotation);

    ctx.globalAlpha = petal.opacity;

    ctx.beginPath();

    ctx.ellipse(
      0,
      0,
      petal.size,
      petal.size * 0.6,
      0,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#D89B37";
    ctx.fill();

    ctx.restore();
  });

  petals = petals.filter(
    petal => petal.y < window.innerHeight + 40
  );

  if (petals.length > 0) {
    petalAnimationFrame =
      requestAnimationFrame(drawPetals);
  } else {
    petalAnimationFrame = null;
  }
}


function startPetals() {
  resizePetalCanvas();

  for (let i = 0; i < 55; i++) {
    petals.push(createPetal());
  }

  if (!petalAnimationFrame) {
    drawPetals();
  }
}


if (pushpanjali) {
  pushpanjali.addEventListener("click", () => {
    if (bellAudio) {
      bellAudio.currentTime = 0;

      bellAudio.play().catch(() => {
        console.log("Bell playback blocked.");
      });
    }

    startPetals();
  });
}


window.addEventListener("resize", resizePetalCanvas);


// ============================================================
// NETWORK RECOVERY
// ============================================================

window.addEventListener("online", () => {
  console.log("[Network] Back online.");

  if (broadcastActive) {
    scheduleReconnect();
  }
});


window.addEventListener("offline", () => {
  console.log("[Network] Offline.");

  if (liveVideo) {
    liveVideo.pause();
  }
});


document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    broadcastActive
  ) {
    scheduleReconnect();
  }
});


// ============================================================
// PAGE CLEANUP
// ============================================================

window.addEventListener("beforeunload", () => {
  manuallyStopped = true;

  clearTimeout(reconnectTimer);

  removeFirebaseListeners();

  if (broadcastUnsubscribe) {
    broadcastUnsubscribe();
  }

  if (peerConnection) {
    try {
      peerConnection.close();
    } catch (_) {}
  }

  if (viewerId) {
    remove(
      ref(db, `pandal/viewers/${viewerId}`)
    ).catch(() => {});
  }
});


// ============================================================
// INITIALIZE
// ============================================================

if (prayerForm) {
  prayerForm.addEventListener(
    "submit",
    submitPrayer
  );
}

loadPrayers();
loadTrack(0, false);
resizePetalCanvas();

showOfflineUI();

listenToBroadcast();

console.log(
  "%cGanpati Digital Darshan initialized.",
  "font-weight:bold"
);
