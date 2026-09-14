// ============================================================
// GANPATI DIGITAL DARSHAN
// app.js
// Complete public-side application
// Firebase + WebRTC Live Darshan + Sankalp + Aarti + Countdown
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  off,
  push
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  databaseURL:
    "https://ganpati-5f24e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ============================================================
// WEBRTC ICE CONFIGURATION
// ============================================================
//
// IMPORTANT:
// Replace the YOUR-TURN-* values with REAL TURN credentials.
//
// STUN helps discover public network addresses.
// TURN is what provides reliable relay connectivity when
// direct peer-to-peer connectivity is impossible.
//

const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  },

  {
    urls: [
      "turn:YOUR-TURN-SERVER:3478?transport=udp",
      "turn:YOUR-TURN-SERVER:3478?transport=tcp",
      "turns:YOUR-TURN-SERVER:5349?transport=tcp"
    ],
    username: "YOUR_TURN_USERNAME",
    credential: "YOUR_TURN_PASSWORD"
  }
];

// ============================================================
// DOM REFERENCES
// ============================================================

const liveVideo = document.getElementById("liveVideo");
const activeStreamUI = document.getElementById("active-stream-ui");
const offlineStreamUI = document.getElementById("offline-stream-ui");

const prayerForm = document.getElementById("prayerForm");
const prayerInput = document.getElementById("prayerInput");
const prayerStatus = document.getElementById("prayerStatus");
const prayerWall = document.getElementById("prayerWall");

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");

const trackTitle = document.getElementById("trackTitle");
const trackNumber = document.getElementById("trackNumber");
const playPauseButton = document.getElementById("playPause");
const playIcon = document.getElementById("playIcon");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const trackList = document.getElementById("trackList");
const aartiAudio = document.getElementById("aartiAudio");

const pushpanjaliButton = document.getElementById("pushpanjali");
const petalCanvas = document.getElementById("petalCanvas");
const bellAudio = document.getElementById("bellAudio");

// ============================================================
// PRELOADER SAFETY
// ============================================================

function removePreloader() {
  const preloader = document.getElementById("preloader");

  if (!preloader) {
    return;
  }

  preloader.classList.add("hidden");

  setTimeout(() => {
    if (preloader && preloader.parentNode) {
      preloader.parentNode.removeChild(preloader);
    }
  }, 900);
}

window.addEventListener("load", () => {
  setTimeout(removePreloader, 400);
});

setTimeout(removePreloader, 3500);

// ============================================================
// LIVE DARSHAN STATE
// ============================================================

let currentBroadcastId = null;
let currentBroadcastData = null;

let viewerId = null;
let viewerPeer = null;

let viewerStarting = false;
let viewerConnected = false;
let viewerStopping = false;

let reconnectTimer = null;
let reconnectAttempts = 0;

let viewerCandidateQueue = [];

let broadcastListenerUnsubscribe = null;
let offerListenerUnsubscribe = null;
let broadcasterCandidateListenerUnsubscribe = null;
let closedListenerUnsubscribe = null;

let activeBroadcastListener = false;

let lastConnectionState = "";
let lastIceConnectionState = "";

let manualStop = false;

// ============================================================
// UNIQUE VIEWER ID
// ============================================================

function createNewViewerId() {
  const randomPart =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2);

  viewerId =
    "viewer_" +
    Date.now().toString(36) +
    "_" +
    randomPart.slice(0, 18);

  return viewerId;
}

// ============================================================
// RANDOM ID HELPER
// ============================================================

function createRandomId(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 12)
  );
}

// ============================================================
// LIVE UI
// ============================================================

function showLiveUI() {
  if (activeStreamUI) {
    activeStreamUI.style.display = "";
    activeStreamUI.hidden = false;
  }

  if (offlineStreamUI) {
    offlineStreamUI.style.display = "none";
    offlineStreamUI.hidden = true;
  }
}

function showOfflineUI() {
  if (activeStreamUI) {
    activeStreamUI.style.display = "none";
    activeStreamUI.hidden = true;
  }

  if (offlineStreamUI) {
    offlineStreamUI.style.display = "";
    offlineStreamUI.hidden = false;
  }

  if (liveVideo) {
    try {
      liveVideo.pause();
    } catch (error) {
      // Ignore
    }

    liveVideo.srcObject = null;
  }
}

// ============================================================
// WEBRTC LOGGING
// ============================================================

function logWebRTC(...args) {
  console.log("[Live Darshan]", ...args);
}

// ============================================================
// REGISTER VIEWER
// ============================================================

async function registerViewer() {
  if (!currentBroadcastId || !viewerId) {
    return false;
  }

  try {
    const viewerRef = ref(db, `pandal/viewers/${viewerId}`);

    await set(viewerRef, {
      active: true,
      broadcastId: currentBroadcastId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    logWebRTC(
      "Viewer registered:",
      viewerId,
      "broadcast:",
      currentBroadcastId
    );

    return true;
  } catch (error) {
    console.error("Failed to register viewer:", error);
    return false;
  }
}

// ============================================================
// MARK VIEWER INACTIVE
// ============================================================

async function markViewerInactive() {
  if (!viewerId) {
    return;
  }

  try {
    const viewerRef = ref(db, `pandal/viewers/${viewerId}`);

    await update(viewerRef, {
      active: false,
      disconnectedAt: Date.now(),
      updatedAt: Date.now()
    });
  } catch (error) {
    console.warn("Unable to mark viewer inactive:", error);
  }
}

// ============================================================
// REMOVE OLD VIEWER
// ============================================================

async function removeViewerNode(id = viewerId) {
  if (!id) {
    return;
  }

  try {
    await remove(ref(db, `pandal/viewers/${id}`));
  } catch (error) {
    console.warn("Unable to remove viewer node:", error);
  }
}

// ============================================================
// CLEAN FIREBASE LISTENERS
// ============================================================

function removeFirebaseLiveListeners() {
  if (offerListenerUnsubscribe) {
    try {
      offerListenerUnsubscribe();
    } catch (error) {
      console.warn("Offer listener cleanup error:", error);
    }

    offerListenerUnsubscribe = null;
  }

  if (broadcasterCandidateListenerUnsubscribe) {
    try {
      broadcasterCandidateListenerUnsubscribe();
    } catch (error) {
      console.warn("Broadcaster ICE listener cleanup error:", error);
    }

    broadcasterCandidateListenerUnsubscribe = null;
  }

  if (closedListenerUnsubscribe) {
    try {
      closedListenerUnsubscribe();
    } catch (error) {
      console.warn("Closed listener cleanup error:", error);
    }

    closedListenerUnsubscribe = null;
  }
}

// ============================================================
// CLEAR RECONNECT TIMER
// ============================================================

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

// ============================================================
// CLOSE PEER CONNECTION
// ============================================================

async function stopViewerConnection(options = {}) {
  const {
    removeViewerRecord = true,
    prepareForReconnect = false
  } = options;

  viewerStopping = true;

  clearReconnectTimer();

  removeFirebaseLiveListeners();

  viewerCandidateQueue = [];

  if (viewerPeer) {
    try {
      viewerPeer.onicecandidate = null;
      viewerPeer.ontrack = null;
      viewerPeer.onconnectionstatechange = null;
      viewerPeer.oniceconnectionstatechange = null;
      viewerPeer.onicegatheringstatechange = null;
      viewerPeer.onsignalingstatechange = null;
    } catch (error) {
      // Ignore
    }

    try {
      if (
        viewerPeer.connectionState !== "closed"
      ) {
        viewerPeer.close();
      }
    } catch (error) {
      console.warn("Peer close error:", error);
    }

    viewerPeer = null;
  }

  viewerConnected = false;
  viewerStarting = false;

  if (liveVideo) {
    try {
      liveVideo.pause();
    } catch (error) {
      // Ignore
    }

    liveVideo.srcObject = null;
  }

  if (removeViewerRecord) {
    await markViewerInactive();

    // Give Firebase a moment to propagate the inactive state
    // before removing the old signaling identity.
    await new Promise((resolve) => setTimeout(resolve, 100));

    await removeViewerNode();
  }

  if (prepareForReconnect) {
    viewerId = null;
  }

  viewerStopping = false;
}

// ============================================================
// FLUSH QUEUED BROADCASTER ICE
// ============================================================

async function flushBroadcasterCandidates() {
  if (!viewerPeer) {
    return;
  }

  if (!viewerPeer.remoteDescription) {
    return;
  }

  if (!viewerCandidateQueue.length) {
    return;
  }

  const queue = [...viewerCandidateQueue];

  viewerCandidateQueue = [];

  for (const candidateData of queue) {
    try {
      const candidate = new RTCIceCandidate(candidateData);

      await viewerPeer.addIceCandidate(candidate);

      logWebRTC("Queued broadcaster ICE candidate added.");
    } catch (error) {
      console.warn(
        "Failed to add queued broadcaster ICE candidate:",
        error
      );
    }
  }
}

// ============================================================
// LISTEN FOR BROADCASTER ICE
// ============================================================

function listenForBroadcasterCandidates() {
  if (!viewerId) {
    return;
  }

  if (broadcasterCandidateListenerUnsubscribe) {
    broadcasterCandidateListenerUnsubscribe();

    broadcasterCandidateListenerUnsubscribe = null;
  }

  const candidatesRef = ref(
    db,
    `pandal/signals/${viewerId}/broadcasterCandidates`
  );

  broadcasterCandidateListenerUnsubscribe = onChildAdded(
    candidatesRef,
    async (snapshot) => {
      const candidateData = snapshot.val();

      if (!candidateData) {
        return;
      }

      if (!viewerPeer) {
        return;
      }

      if (viewerPeer.remoteDescription) {
        try {
          await viewerPeer.addIceCandidate(
            new RTCIceCandidate(candidateData)
          );

          logWebRTC("Broadcaster ICE candidate added.");
        } catch (error) {
          console.warn(
            "Error adding broadcaster ICE candidate:",
            error
          );
        }
      } else {
        viewerCandidateQueue.push(candidateData);

        logWebRTC(
          "Broadcaster ICE queued until remote description exists."
        );
      }
    }
  );
}

// ============================================================
// LISTEN FOR CLOSED SIGNAL
// ============================================================

function listenForClosedSignal() {
  if (!viewerId) {
    return;
  }

  if (closedListenerUnsubscribe) {
    closedListenerUnsubscribe();

    closedListenerUnsubscribe = null;
  }

  const closedRef = ref(
    db,
    `pandal/signals/${viewerId}/closed`
  );

  closedListenerUnsubscribe = onValue(
    closedRef,
    async (snapshot) => {
      const closedData = snapshot.val();

      if (!closedData) {
        return;
      }

      logWebRTC(
        "Broadcaster closed the connection:",
        closedData
      );

      if (!currentBroadcastId) {
        return;
      }

      scheduleReconnect(
        "Broadcaster closed the viewer connection."
      );
    }
  );
}

// ============================================================
// HANDLE REMOTE STREAM
// ============================================================

async function handleRemoteStream(stream) {
  if (!liveVideo) {
    return;
  }

  logWebRTC(
    "Remote stream received.",
    "Tracks:",
    stream.getTracks().map((track) => track.kind)
  );

  liveVideo.srcObject = stream;

  showLiveUI();

  try {
    await liveVideo.play();

    logWebRTC("Live video playback started.");
  } catch (error) {
    console.warn(
      "Autoplay was not allowed. The stream exists, but playback may require interaction.",
      error
    );
  }
}

// ============================================================
// CREATE VIEWER PEER
// ============================================================

async function createViewerPeer() {
  if (!viewerId || !currentBroadcastId) {
    return null;
  }

  const peer = new RTCPeerConnection({
    iceServers: ICE_SERVERS,

    iceCandidatePoolSize: 10,

    bundlePolicy: "max-bundle",

    rtcpMuxPolicy: "require"
  });

  viewerPeer = peer;

  peer.onicecandidate = async (event) => {
    if (!event.candidate) {
      return;
    }

    if (!viewerId) {
      return;
    }

    try {
      const candidateId = createRandomId("candidate");

      await set(
        ref(
          db,
          `pandal/signals/${viewerId}/viewerCandidates/${candidateId}`
        ),
        event.candidate.toJSON()
      );

      logWebRTC("Viewer ICE candidate sent.");
    } catch (error) {
      console.warn(
        "Unable to send viewer ICE candidate:",
        error
      );
    }
  };

  peer.ontrack = async (event) => {
    logWebRTC(
      "ontrack received:",
      event.track.kind
    );

    let remoteStream = null;

    if (event.streams && event.streams.length > 0) {
      remoteStream = event.streams[0];
    } else {
      remoteStream = new MediaStream();

      if (event.track) {
        remoteStream.addTrack(event.track);
      }
    }

    await handleRemoteStream(remoteStream);
  };

  peer.onconnectionstatechange = () => {
    if (!viewerPeer || viewerPeer !== peer) {
      return;
    }

    const state = peer.connectionState;

    if (state !== lastConnectionState) {
      lastConnectionState = state;

      logWebRTC(
        "Viewer connection state:",
        state
      );
    }

    if (state === "connected") {
      viewerConnected = true;
      viewerStarting = false;
      reconnectAttempts = 0;

      showLiveUI();

      return;
    }

    if (state === "failed") {
      viewerConnected = false;

      scheduleReconnect(
        "WebRTC connection failed."
      );

      return;
    }

    if (state === "disconnected") {
      viewerConnected = false;

      scheduleReconnect(
        "WebRTC connection disconnected."
      );
    }

    if (state === "closed") {
      viewerConnected = false;
    }
  };

  peer.oniceconnectionstatechange = () => {
    if (!viewerPeer || viewerPeer !== peer) {
      return;
    }

    const state = peer.iceConnectionState;

    if (state !== lastIceConnectionState) {
      lastIceConnectionState = state;

      logWebRTC(
        "Viewer ICE connection state:",
        state
      );
    }

    if (state === "connected" || state === "completed") {
      viewerConnected = true;
      reconnectAttempts = 0;

      showLiveUI();

      return;
    }

    if (state === "failed") {
      viewerConnected = false;

      scheduleReconnect(
        "ICE connection failed."
      );

      return;
    }

    if (state === "disconnected") {
      viewerConnected = false;

      scheduleReconnect(
        "ICE connection disconnected."
      );
    }
  };

  peer.onicegatheringstatechange = () => {
    logWebRTC(
      "ICE gathering state:",
      peer.iceGatheringState
    );
  };

  peer.onsignalingstatechange = () => {
    logWebRTC(
      "Signaling state:",
      peer.signalingState
    );
  };

  return peer;
}

// ============================================================
// LISTEN FOR OFFER
// ============================================================

function listenForOffer() {
  if (!viewerId) {
    return;
  }

  if (offerListenerUnsubscribe) {
    offerListenerUnsubscribe();

    offerListenerUnsubscribe = null;
  }

  const offerRef = ref(
    db,
    `pandal/signals/${viewerId}/offer`
  );

  offerListenerUnsubscribe = onValue(
    offerRef,
    async (snapshot) => {
      const offer = snapshot.val();

      if (!offer) {
        return;
      }

      if (!viewerPeer) {
        return;
      }

      if (viewerPeer.signalingState !== "stable") {
        logWebRTC(
          "Ignoring offer because signaling state is:",
          viewerPeer.signalingState
        );

        return;
      }

      try {
        logWebRTC("Offer received.");

        await viewerPeer.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        await flushBroadcasterCandidates();

        const answer =
          await viewerPeer.createAnswer();

        await viewerPeer.setLocalDescription(answer);

        await set(
          ref(
            db,
            `pandal/signals/${viewerId}/answer`
          ),
          {
            type: answer.type,
            sdp: answer.sdp
          }
        );

        logWebRTC("Answer created and sent.");
      } catch (error) {
        console.error(
          "Error handling broadcaster offer:",
          error
        );

        scheduleReconnect(
          "Unable to complete WebRTC offer/answer negotiation."
        );
      }
    }
  );
}

// ============================================================
// CONNECT TO CURRENT BROADCAST
// ============================================================

async function connectToBroadcast() {
  if (!currentBroadcastId) {
    return;
  }

  if (viewerStarting) {
    return;
  }

  if (viewerConnected && viewerPeer) {
    return;
  }

  if (viewerStopping) {
    return;
  }

  viewerStarting = true;

  clearReconnectTimer();

  logWebRTC(
    "Starting viewer connection for broadcast:",
    currentBroadcastId
  );

  try {
    // --------------------------------------------------------
    // Completely clean any previous viewer identity.
    // --------------------------------------------------------

    await stopViewerConnection({
      removeViewerRecord: true,
      prepareForReconnect: true
    });

    // --------------------------------------------------------
    // Generate a fresh identity.
    // --------------------------------------------------------

    createNewViewerId();

    // --------------------------------------------------------
    // Register viewer.
    // --------------------------------------------------------

    const registered = await registerViewer();

    if (!registered) {
      throw new Error(
        "Viewer registration failed."
      );
    }

    // --------------------------------------------------------
    // Create peer connection.
    // --------------------------------------------------------

    const peer = await createViewerPeer();

    if (!peer) {
      throw new Error(
        "Unable to create RTCPeerConnection."
      );
    }

    // --------------------------------------------------------
    // Set up Firebase signaling listeners BEFORE waiting
    // for the offer. This prevents race conditions.
    // --------------------------------------------------------

    listenForBroadcasterCandidates();

    listenForOffer();

    listenForClosedSignal();

    viewerStarting = false;

    logWebRTC(
      "Viewer is ready and waiting for broadcaster offer."
    );
  } catch (error) {
    viewerStarting = false;

    console.error(
      "Viewer connection failed:",
      error
    );

    scheduleReconnect(
      "Unable to start Live Darshan connection."
    );
  }
}

// ============================================================
// AUTOMATIC RECONNECT
// ============================================================

function scheduleReconnect(reason = "Connection recovery") {
  if (manualStop) {
    return;
  }

  if (!currentBroadcastId) {
    return;
  }

  if (reconnectTimer) {
    return;
  }

  reconnectAttempts += 1;

  const maxDelay = 30000;

  const delay = Math.min(
    1000 * Math.pow(2, reconnectAttempts - 1),
    maxDelay
  );

  logWebRTC(
    `Scheduling reconnect #${reconnectAttempts} in ${delay}ms:`,
    reason
  );

  showOfflineUI();

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    if (!currentBroadcastId) {
      return;
    }

    try {
      await stopViewerConnection({
        removeViewerRecord: true,
        prepareForReconnect: true
      });
    } catch (error) {
      console.warn(
        "Reconnect cleanup error:",
        error
      );
    }

    await connectToBroadcast();
  }, delay);
}

// ============================================================
// STOP LIVE CONNECTION
// ============================================================

async function stopLiveConnection() {
  manualStop = true;

  clearReconnectTimer();

  await stopViewerConnection({
    removeViewerRecord: true,
    prepareForReconnect: true
  });

  currentBroadcastId = null;
  currentBroadcastData = null;

  showOfflineUI();

  manualStop = false;
}

// ============================================================
// BROADCAST STATE LISTENER
// ============================================================

function listenToBroadcastState() {
  if (activeBroadcastListener) {
    return;
  }

  activeBroadcastListener = true;

  const broadcastRef = ref(
    db,
    "pandal/broadcast"
  );

  broadcastListenerUnsubscribe = onValue(
    broadcastRef,
    async (snapshot) => {
      const broadcast = snapshot.val();

      // ------------------------------------------------------
      // No active broadcast
      // ------------------------------------------------------

      if (
        !broadcast ||
        broadcast.active !== true ||
        !broadcast.id
      ) {
        logWebRTC(
          "No active broadcast."
        );

        currentBroadcastData = null;

        await stopLiveConnection();

        return;
      }

      const incomingBroadcastId =
        String(broadcast.id);

      // ------------------------------------------------------
      // First active broadcast
      // ------------------------------------------------------

      if (!currentBroadcastId) {
        currentBroadcastId =
          incomingBroadcastId;

        currentBroadcastData = broadcast;

        manualStop = false;

        showLiveUI();

        reconnectAttempts = 0;

        await connectToBroadcast();

        return;
      }

      // ------------------------------------------------------
      // Same broadcast
      // ------------------------------------------------------

      if (
        currentBroadcastId ===
        incomingBroadcastId
      ) {
        currentBroadcastData = broadcast;

        return;
      }

      // ------------------------------------------------------
      // Broadcaster restarted.
      // ------------------------------------------------------

      logWebRTC(
        "Broadcast ID changed.",
        currentBroadcastId,
        "→",
        incomingBroadcastId
      );

      currentBroadcastId =
        incomingBroadcastId;

      currentBroadcastData = broadcast;

      reconnectAttempts = 0;

      manualStop = false;

      await stopViewerConnection({
        removeViewerRecord: true,
        prepareForReconnect: true
      });

      showLiveUI();

      await connectToBroadcast();
    },
    (error) => {
      console.error(
        "Broadcast listener error:",
        error
      );

      scheduleReconnect(
        "Firebase broadcast listener error."
      );
    }
  );
}

// ============================================================
// SANKALP WALL
// ============================================================

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// RENDER PRAYER WALL
// ============================================================

function renderPrayerWall(data) {
  if (!prayerWall) {
    return;
  }

  prayerWall.innerHTML = "";

  if (!data) {
    const empty = document.createElement("div");

    empty.className = "prayer-empty";

    empty.textContent =
      "Be the first to offer a Sankalp.";

    prayerWall.appendChild(empty);

    return;
  }

  const entries = Object.entries(data)
    .map(([id, prayer]) => ({
      id,
      ...prayer
    }))
    .filter(
      (prayer) =>
        prayer &&
        typeof prayer.text === "string"
    )
    .sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

  if (!entries.length) {
    const empty = document.createElement("div");

    empty.className = "prayer-empty";

    empty.textContent =
      "Be the first to offer a Sankalp.";

    prayerWall.appendChild(empty);

    return;
  }

  entries.forEach((prayer) => {
    const item = document.createElement("div");

    item.className = "prayer-item";

    const text = document.createElement("div");

    text.className = "prayer-text";

    text.textContent = prayer.text;

    item.appendChild(text);

    if (prayer.createdAt) {
      const date = document.createElement("div");

      date.className = "prayer-date";

      try {
        date.textContent =
          new Date(
            Number(prayer.createdAt)
          ).toLocaleDateString(
            "en-IN",
            {
              day: "numeric",
              month: "short",
              year: "numeric"
            }
          );
      } catch (error) {
        date.textContent = "";
      }

      item.appendChild(date);
    }

    prayerWall.appendChild(item);
  });
}

// ============================================================
// LOAD SANKALP WALL
// ============================================================

function listenToPrayerWall() {
  if (!prayerWall) {
    return;
  }

  const prayersRef = ref(
    db,
    "pandal/prayers_wall"
  );

  onValue(
    prayersRef,
    (snapshot) => {
      renderPrayerWall(snapshot.val());
    },
    (error) => {
      console.error(
        "Prayer wall error:",
        error
      );

      prayerWall.innerHTML = "";

      const errorElement =
        document.createElement("div");

      errorElement.className =
        "prayer-empty";

      errorElement.textContent =
        "Unable to load the Sankalp wall right now.";

      prayerWall.appendChild(
        errorElement
      );
    }
  );
}

// ============================================================
// SUBMIT SANKALP
// ============================================================

if (prayerForm) {
  prayerForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!prayerInput) {
        return;
      }

      const text =
        prayerInput.value
          .trim();

      if (!text) {
        if (prayerStatus) {
          prayerStatus.textContent =
            "Please enter your Sankalp.";
        }

        return;
      }

      if (text.length > 50) {
        if (prayerStatus) {
          prayerStatus.textContent =
            "Please keep your Sankalp within 50 characters.";
        }

        return;
      }

      if (prayerStatus) {
        prayerStatus.textContent =
          "Offering your Sankalp…";
      }

      try {
        const prayerRef =
          push(
            ref(
              db,
              "pandal/prayers_wall"
            )
          );

        await set(prayerRef, {
          text,
          createdAt: Date.now()
        });

        prayerInput.value = "";

        if (prayerStatus) {
          prayerStatus.textContent =
            "Your Sankalp has been offered with devotion. 🙏";
        }

        setTimeout(() => {
          if (prayerStatus) {
            prayerStatus.textContent = "";
          }
        }, 4000);
      } catch (error) {
        console.error(
          "Sankalp submission error:",
          error
        );

        if (prayerStatus) {
          prayerStatus.textContent =
            "Unable to submit right now. Please try again.";
        }
      }
    }
  );
}

// ============================================================
// AARTI PLAYLIST
// ============================================================

const aartiTracks = [
  {
    title: "Gajanana",
    src: "assets/Gajanana.mp3"
  },

  {
    title:
      "Ganpati Bappa Moriya Humse Badhkar Kaun",
    src:
      "assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  },

  {
    title:
      "Jalwa Mera Hi Jalwa",
    src:
      "assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  },

  {
    title:
      "Sukhkarta Dukhharta",
    src:
      "assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  },

  {
    title:
      "Jai Ganesh Jai Ganesh Deva",
    src:
      "assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  },

  {
    title:
      "Maurya Re",
    src:
      "assets/Maurya Re Don 2006 128 Kbps.mp3"
  },

  {
    title:
      "Shendur Laal Chadhayo",
    src:
      "assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  },

  {
    title:
      "Suno Ganpati Bappa Morya",
    src:
      "assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  },

  {
    title:
      "Shree Ganeshay Dheemahi",
    src:
      "assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  }
];

let currentTrackIndex = 0;
let isAartiPlaying = false;

// ============================================================
// FORMAT TIME
// ============================================================

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    Math.floor(seconds % 60);

  return (
    minutes +
    ":" +
    String(
      remainingSeconds
    ).padStart(2, "0")
  );
}

// ============================================================
// UPDATE PLAY ICON
// ============================================================

function updatePlayIcon() {
  if (!playIcon) {
    return;
  }

  if (isAartiPlaying) {
    playIcon.textContent = "Ⅱ";
  } else {
    playIcon.textContent = "▶";
  }
}

// ============================================================
// LOAD AARTI TRACK
// ============================================================

function loadAartiTrack(
  index,
  autoplay = false
) {
  if (!aartiAudio) {
    return;
  }

  if (
    index < 0 ||
    index >= aartiTracks.length
  ) {
    return;
  }

  currentTrackIndex = index;

  const track =
    aartiTracks[currentTrackIndex];

  aartiAudio.src = track.src;

  aartiAudio.load();

  if (trackTitle) {
    trackTitle.textContent =
      track.title;
  }

  if (trackNumber) {
    trackNumber.textContent =
      `${currentTrackIndex + 1} / ${aartiTracks.length}`;
  }

  if (progress) {
    progress.value = 0;
  }

  if (currentTimeEl) {
    currentTimeEl.textContent =
      "0:00";
  }

  if (durationEl) {
    durationEl.textContent =
      "0:00";
  }

  updateAartiTrackList();

  if (autoplay) {
    const playPromise =
      aartiAudio.play();

    if (
      playPromise &&
      typeof playPromise.catch ===
        "function"
    ) {
      playPromise.catch(
        (error) => {
          console.warn(
            "Aarti autoplay prevented:",
            error
          );

          isAartiPlaying = false;

          updatePlayIcon();
        }
      );
    }
  }
}

// ============================================================
// RENDER AARTI TRACK LIST
// ============================================================

function updateAartiTrackList() {
  if (!trackList) {
    return;
  }

  const buttons =
    trackList.querySelectorAll(
      "[data-track-index]"
    );

  buttons.forEach((button) => {
    const index =
      Number(
        button.dataset.trackIndex
      );

    button.classList.toggle(
      "active",
      index === currentTrackIndex
    );
  });
}

// ============================================================
// BUILD AARTI LIST IF EMPTY
// ============================================================

function buildAartiTrackList() {
  if (!trackList) {
    return;
  }

  // If HTML already contains track entries,
  // don't destroy its existing design.
  if (
    trackList.children &&
    trackList.children.length > 0
  ) {
    const existing =
      trackList.querySelectorAll(
        "[data-track-index]"
      );

    if (existing.length > 0) {
      existing.forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const index =
              Number(
                button.dataset.trackIndex
              );

            loadAartiTrack(
              index,
              true
            );
          }
        );
      });

      updateAartiTrackList();

      return;
    }
  }

  // Otherwise create a clean list.
  trackList.innerHTML = "";

  aartiTracks.forEach(
    (track, index) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.dataset.trackIndex =
        String(index);

      button.className =
        "aarti-track";

      button.innerHTML = `
        <span class="aarti-track-number">
          ${String(index + 1).padStart(2, "0")}
        </span>
        <span class="aarti-track-title">
          ${escapeHTML(track.title)}
        </span>
      `;

      button.addEventListener(
        "click",
        () => {
          loadAartiTrack(
            index,
            true
          );
        }
      );

      trackList.appendChild(
        button
      );
    }
  );

  updateAartiTrackList();
}

// ============================================================
// AARTI PLAY / PAUSE
// ============================================================

if (playPauseButton) {
  playPauseButton.addEventListener(
    "click",
    async () => {
      if (!aartiAudio) {
        return;
      }

      try {
        if (
          aartiAudio.paused
        ) {
          await aartiAudio.play();

          isAartiPlaying = true;
        } else {
          aartiAudio.pause();

          isAartiPlaying = false;
        }

        updatePlayIcon();
      } catch (error) {
        console.warn(
          "Unable to play Aarti:",
          error
        );

        isAartiPlaying = false;

        updatePlayIcon();
      }
    }
  );
}

// ============================================================
// AARTI EVENTS
// ============================================================

if (aartiAudio) {
  aartiAudio.addEventListener(
    "play",
    () => {
      isAartiPlaying = true;

      updatePlayIcon();
    }
  );

  aartiAudio.addEventListener(
    "pause",
    () => {
      isAartiPlaying = false;

      updatePlayIcon();
    }
  );

  aartiAudio.addEventListener(
    "loadedmetadata",
    () => {
      if (durationEl) {
        durationEl.textContent =
          formatAudioTime(
            aartiAudio.duration
          );
      }
    }
  );

  aartiAudio.addEventListener(
    "timeupdate",
    () => {
      const current =
        aartiAudio.currentTime || 0;

      const duration =
        aartiAudio.duration || 0;

      if (currentTimeEl) {
        currentTimeEl.textContent =
          formatAudioTime(
            current
          );
      }

      if (durationEl) {
        durationEl.textContent =
          formatAudioTime(
            duration
          );
      }

      if (progress) {
        if (duration > 0) {
          progress.value =
            (
              current /
              duration
            ) * 100;
        } else {
          progress.value = 0;
        }
      }
    }
  );

  aartiAudio.addEventListener(
    "ended",
    () => {
      const nextIndex =
        currentTrackIndex + 1;

      if (
        nextIndex <
        aartiTracks.length
      ) {
        loadAartiTrack(
          nextIndex,
          true
        );
      } else {
        isAartiPlaying = false;

        updatePlayIcon();
      }
    }
  );

  aartiAudio.addEventListener(
    "error",
    (event) => {
      console.warn(
        "Aarti audio error:",
        event
      );
    }
  );
}

// ============================================================
// AARTI PROGRESS SEEK
// ============================================================

if (progress) {
  progress.addEventListener(
    "input",
    () => {
      if (!aartiAudio) {
        return;
      }

      const duration =
        aartiAudio.duration;

      if (
        !Number.isFinite(
          duration
        ) ||
        duration <= 0
      ) {
        return;
      }

      const percentage =
        Number(
          progress.value
        ) / 100;

      aartiAudio.currentTime =
        duration * percentage;
    }
  );
}

// ============================================================
// COUNTDOWN
// ============================================================

const celebrationDate =
  new Date(
    "2026-09-24T00:00:00+05:30"
  ).getTime();

function updateCountdown() {
  const now =
    Date.now();

  const difference =
    celebrationDate - now;

  if (difference <= 0) {
    if (daysEl) {
      daysEl.textContent = "00";
    }

    if (hoursEl) {
      hoursEl.textContent = "00";
    }

    if (minutesEl) {
      minutesEl.textContent = "00";
    }

    if (secondsEl) {
      secondsEl.textContent = "00";
    }

    const countdown =
      document.getElementById(
        "countdown"
      );

    if (countdown) {
      countdown.classList.add(
        "celebration-ended"
      );
    }

    return;
  }

  const totalSeconds =
    Math.floor(
      difference / 1000
    );

  const days =
    Math.floor(
      totalSeconds /
        86400
    );

  const hours =
    Math.floor(
      (totalSeconds %
        86400) /
        3600
    );

  const minutes =
    Math.floor(
      (totalSeconds %
        3600) /
        60
    );

  const seconds =
    totalSeconds % 60;

  if (daysEl) {
    daysEl.textContent =
      String(days).padStart(
        2,
        "0"
      );
  }

  if (hoursEl) {
    hoursEl.textContent =
      String(hours).padStart(
        2,
        "0"
      );
  }

  if (minutesEl) {
    minutesEl.textContent =
      String(minutes).padStart(
        2,
        "0"
      );
  }

  if (secondsEl) {
    secondsEl.textContent =
      String(seconds).padStart(
        2,
        "0"
      );
  }
}

updateCountdown();

setInterval(
  updateCountdown,
  1000
);

// ============================================================
// PUSHpanjali / BELL
// ============================================================

let petalAnimationFrame = null;
let petals = [];

function setupPetalCanvas() {
  if (!petalCanvas) {
    return;
  }

  const canvas =
    petalCanvas;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    return;
  }

  function resizeCanvas() {
    const ratio =
      window.devicePixelRatio ||
      1;

    canvas.width =
      window.innerWidth *
      ratio;

    canvas.height =
      window.innerHeight *
      ratio;

    canvas.style.width =
      window.innerWidth +
      "px";

    canvas.style.height =
      window.innerHeight +
      "px";

    context.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );
  }

  resizeCanvas();

  window.addEventListener(
    "resize",
    resizeCanvas
  );
}

function createPetal() {
  return {
    x:
      Math.random() *
      window.innerWidth,

    y:
      -20 -
      Math.random() *
        80,

    size:
      4 +
      Math.random() * 7,

    speed:
      1 +
      Math.random() * 2.5,

    drift:
      -1 +
      Math.random() * 2,

    rotation:
      Math.random() *
      Math.PI *
      2,

    rotationSpeed:
      -0.05 +
      Math.random() * 0.1,

    opacity:
      0.65 +
      Math.random() * 0.35
  };
}

function startPetalAnimation() {
  if (!petalCanvas) {
    return;
  }

  const canvas =
    petalCanvas;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    return;
  }

  petals = [];

  for (
    let i = 0;
    i < 70;
    i++
  ) {
    const petal =
      createPetal();

    petal.y =
      Math.random() *
      window.innerHeight;

    petals.push(petal);
  }

  function animate() {
    context.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );

    petals.forEach(
      (petal) => {
        petal.y +=
          petal.speed;

        petal.x +=
          petal.drift;

        petal.rotation +=
          petal.rotationSpeed;

        if (
          petal.y >
          window.innerHeight +
            30
        ) {
          Object.assign(
            petal,
            createPetal()
          );
        }

        if (
          petal.x <
          -30
        ) {
          petal.x =
            window.innerWidth +
            20;
        }

        if (
          petal.x >
          window.innerWidth +
            30
        ) {
          petal.x = -20;
        }

        context.save();

        context.translate(
          petal.x,
          petal.y
        );

        context.rotate(
          petal.rotation
        );

        context.globalAlpha =
          petal.opacity;

        context.beginPath();

        context.ellipse(
          0,
          0,
          petal.size,
          petal.size * 0.55,
          0,
          0,
          Math.PI * 2
        );

        context.fillStyle =
          "#D98A35";

        context.fill();

        context.restore();
      }
    );

    petalAnimationFrame =
      requestAnimationFrame(
        animate
      );
  }

  if (
    petalAnimationFrame
  ) {
    cancelAnimationFrame(
      petalAnimationFrame
    );
  }

  animate();

  setTimeout(
    () => {
      if (
        petalAnimationFrame
      ) {
        cancelAnimationFrame(
          petalAnimationFrame
        );

        petalAnimationFrame =
          null;
      }

      context.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );
    },
    6500
  );
}

function playBell() {
  if (!bellAudio) {
    return;
  }

  try {
    bellAudio.currentTime = 0;

    const promise =
      bellAudio.play();

    if (
      promise &&
      typeof promise.catch ===
        "function"
    ) {
      promise.catch(
        (error) => {
          console.warn(
            "Bell playback failed:",
            error
          );
        }
      );
    }
  } catch (error) {
    console.warn(
      "Bell playback error:",
      error
    );
  }
}

if (pushpanjaliButton) {
  pushpanjaliButton.addEventListener(
    "click",
    () => {
      playBell();

      startPetalAnimation();

      pushpanjaliButton.classList.add(
        "active"
      );

      setTimeout(
        () => {
          pushpanjaliButton.classList.remove(
            "active"
          );
        },
        1000
      );
    }
  );
}

setupPetalCanvas();

// ============================================================
// HERO SANKALP BUTTON
// ============================================================

function scrollToSankalp() {
  const section =
    document.getElementById(
      "sankalp"
    );

  if (!section) {
    return;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setTimeout(
    () => {
      if (prayerInput) {
        try {
          prayerInput.focus({
            preventScroll: true
          });
        } catch (error) {
          prayerInput.focus();
        }
      }
    },
    700
  );
}

const sankalpButtons =
  document.querySelectorAll(
    '[data-scroll-to="sankalp"], .sankalp-scroll, #makeSankalp'
  );

sankalpButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        scrollToSankalp();
      }
    );
  }
);

// ============================================================
// LIVE DARSHAN BUTTON
// ============================================================

const liveButtons =
  document.querySelectorAll(
    '[data-scroll-to="live"], .live-scroll, #liveDarshanButton'
  );

liveButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        const liveSection =
          document.getElementById(
            "live"
          ) ||
          document.getElementById(
            "darshan"
          );

        if (!liveSection) {
          return;
        }

        liveSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    );
  }
);

// ============================================================
// ONLINE / OFFLINE RECOVERY
// ============================================================

window.addEventListener(
  "online",
  async () => {
    logWebRTC(
      "Network is back online."
    );

    if (!currentBroadcastId) {
      return;
    }

    reconnectAttempts = 0;

    await stopViewerConnection({
      removeViewerRecord: true,
      prepareForReconnect: true
    });

    await connectToBroadcast();
  }
);

window.addEventListener(
  "offline",
  () => {
    logWebRTC(
      "Network connection lost."
    );

    if (viewerPeer) {
      try {
        viewerPeer.close();
      } catch (error) {
        // Ignore
      }

      viewerPeer = null;
    }

    viewerConnected = false;

    showOfflineUI();
  }
);

// ============================================================
// PAGE VISIBILITY RECOVERY
// ============================================================

document.addEventListener(
  "visibilitychange",
  async () => {
    if (
      document.visibilityState !==
      "visible"
    ) {
      return;
    }

    logWebRTC(
      "Page became visible again."
    );

    if (!currentBroadcastId) {
      return;
    }

    if (
      viewerPeer &&
      (
        viewerPeer.connectionState ===
          "connected" ||
        viewerPeer.iceConnectionState ===
          "connected" ||
        viewerPeer.iceConnectionState ===
          "completed"
      )
    ) {
      // Try to resume playback if the browser
      // paused the video while backgrounded.
      if (liveVideo) {
        try {
          await liveVideo.play();
        } catch (error) {
          console.warn(
            "Unable to resume live video:",
            error
          );
        }
      }

      return;
    }

    reconnectAttempts = 0;

    await stopViewerConnection({
      removeViewerRecord: true,
      prepareForReconnect: true
    });

    await connectToBroadcast();
  }
);

// ============================================================
// PERIODIC LIVE CONNECTION HEALTH CHECK
// ============================================================

setInterval(
  async () => {
    if (!currentBroadcastId) {
      return;
    }

    if (!viewerPeer) {
      if (!reconnectTimer && !viewerStarting) {
        scheduleReconnect(
          "Live peer connection is missing."
        );
      }

      return;
    }

    const connectionState =
      viewerPeer.connectionState;

    const iceState =
      viewerPeer.iceConnectionState;

    if (
      connectionState ===
        "failed" ||
      iceState ===
        "failed"
    ) {
      scheduleReconnect(
        "Periodic health check detected failed WebRTC connection."
      );

      return;
    }

    if (
      connectionState ===
        "disconnected" ||
      iceState ===
        "disconnected"
    ) {
      scheduleReconnect(
        "Periodic health check detected disconnected WebRTC connection."
      );
    }
  },
  10000
);

// ============================================================
// BEFORE UNLOAD CLEANUP
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {
    clearReconnectTimer();

    removeFirebaseLiveListeners();

    if (viewerPeer) {
      try {
        viewerPeer.close();
      } catch (error) {
        // Ignore
      }
    }

    // Fire-and-forget Firebase update.
    if (viewerId) {
      try {
        update(
          ref(
            db,
            `pandal/viewers/${viewerId}`
          ),
          {
            active: false,
            disconnectedAt: Date.now(),
            updatedAt: Date.now()
          }
        );
      } catch (error) {
        // Ignore
      }
    }
  }
);

// ============================================================
// INITIALIZE APPLICATION
// ============================================================

function initializeApplication() {
  logWebRTC(
    "Initializing Ganpati Digital Darshan..."
  );

  // ----------------------------------------------------------
  // Live
  // ----------------------------------------------------------

  showOfflineUI();

  listenToBroadcastState();

  // ----------------------------------------------------------
  // Sankalp
  // ----------------------------------------------------------

  listenToPrayerWall();

  // ----------------------------------------------------------
  // Aarti
  // ----------------------------------------------------------

  buildAartiTrackList();

  loadAartiTrack(
    0,
    false
  );

  // ----------------------------------------------------------
  // Countdown
  // ----------------------------------------------------------

  updateCountdown();

  // ----------------------------------------------------------
  // Preloader
  // ----------------------------------------------------------

  setTimeout(
    removePreloader,
    500
  );

  logWebRTC(
    "Application initialized successfully."
  );
}

// ============================================================
// START
// ============================================================

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication,
    {
      once: true
    }
  );
} else {
  initializeApplication();
}

// ============================================================
// DEBUG HELPERS
// ============================================================
//
// Available from browser console:
// window.ganpatiLiveDebug()
//
// Useful when testing Live Darshan.
//

window.ganpatiLiveDebug =
  function () {
    return {
      broadcastId:
        currentBroadcastId,

      viewerId,

      viewerStarting,

      viewerConnected,

      reconnectAttempts,

      connectionState:
        viewerPeer
          ? viewerPeer.connectionState
          : null,

      iceConnectionState:
        viewerPeer
          ? viewerPeer.iceConnectionState
          : null,

      signalingState:
        viewerPeer
          ? viewerPeer.signalingState
          : null,

      iceGatheringState:
        viewerPeer
          ? viewerPeer.iceGatheringState
          : null,

      remoteVideo:
        liveVideo
          ? liveVideo.srcObject
          : null,

      remoteTracks:
        liveVideo &&
        liveVideo.srcObject
          ? liveVideo.srcObject
              .getTracks()
              .map(
                (track) => ({
                  kind: track.kind,
                  enabled:
                    track.enabled,
                  muted:
                    track.muted,
                  readyState:
                    track.readyState
                })
              )
          : []
    };
  };

console.log(
  "%cॐ Ganpati Digital Darshan",
  "font-size:18px;font-weight:bold;"
);

console.log(
  "%cLive WebRTC system initialized.",
  "font-size:13px;"
);

console.log(
  "Run ganpatiLiveDebug() in the console to inspect Live Darshan."
);
